"use strict";

var path = require( "path" );
var htmlparser = require( "htmlparser2" );
var xtend = require( "xtend" );

var css = require( "./css" );
var svg = require( "./svg" );
var isBase64Path = require( "./util/isBase64Path" );
var isCIDPath = require( "./util/isCIDPath" );

var getTextReplacement = require( "./util/getTextReplacement" );
var getFileReplacement = require( "./util/getFileReplacement" );
var isFunction = require( "./util/isFunction" );

module.exports = function( options, callback )
{
    options = require( "./options" )( options );
    var sourceAttributes = [ "src", "href", "srcset", "xlink:href" ];

    // Normalize svg and srcset paths
    function normalizeSource( src ) {
        if ( !src ) { return ""; }
        return src.split( "#" )[0].split( " " )[0];
    }

    function getContentLimit( el ) {
        switch ( el.name ) {
            case "img":
                return options.images;
            case "use":
                return options.svgs;
            case "link":
                return options.links;
            case "script":
                return options.scripts;
        }
    }

    function validateElement( el, attr ) {
        var src = el.attribs[ attr ];

        function inlineAttributeCheck() {
            function isset( obj ) { return obj !== undefined; }

            return ( !isset( el.attribs[options.inlineAttribute + "-ignore"] ) &&
                getContentLimit( el ) || isset( el.attribs[options.inlineAttribute] ) );
        }

        if ( !src ||
            !inlineAttributeCheck() ||
            isBase64Path( src ) ||
            isCIDPath( src ) ) {
            return false; // Skip
        }

        return true;
    }

    function getElementSources( el ) {
        return sourceAttributes.reduce( function( result, attr ) {
            if ( !validateElement( el, attr ) ) {
                return result; // Skip
            }

            return result.concat( [
                normalizeSource( el.attribs[ attr ] ),
                ( el.name === "use" ? "svg" : el.name ),
                getContentLimit( el )
            ] );
        }, [] );
    }

    function resolveSource( src, type, limit ) {

        var replacer = ( function() {
            if ( [ "img" ].indexOf( type ) !== -1 ) {
                return getFileReplacement;
            } else {
                return getTextReplacement;
            }
        } )();

        return new Promise( function( resolve, reject ) {
            return replacer( normalizeSource( src ), options, function( err, content ) {
                if ( err ) {
                    if ( options.strict ) {
                        return reject( err );
                    } else {
                        console.warn( "Not found, skipping: " + src  );
                        return resolve(); // Skip
                    }
                }
                return resolve( content );
            } );
        } ).then( function( content ) {
            if ( !content ) {
                return;  // Skip
            }

            // Handle transformations
            if ( !options[ type+"Transform" ] ) {
                return content; // Skip
            }

            return new Promise( function( resolve, reject ) {
                options[ type+"Transform" ]( content, function( err, content ) {
                    if ( err ) {
                        return reject( err );
                    }
                    return resolve( content );
                } );
            } );
        } ).then( function( content ) {
            if ( !content || typeof( limit ) === "number" &&
                content.length > limit * 1000 ) {
                return; // Skip
            }

            return [ src, content ];
        } );
    }

    function replaceContent( el, attr, content ) {

        function createTextChild( content ) {
            return [ {
                data: "\n",
                type: "text"
            }, {
                data: content,
                type: "text"
            }, {
                data: "\n",
                type: "text"
            } ];
        }

        // Replace content and/or element
        if ( el.name === "img" ) {
            if ( attr === "srcset" ) {
                content = content + " " +
                    el.attribs[ attr ].split( " " )[1];
            }
            return el.attribs[ attr ] = content;
        }

        if ( el.name === "link" ) {
            // Inline images for each source in the CSS
            return css( xtend( {}, options, {
                fileContent: content,
                rebaseRelativeTo: path.relative( options.relativeTo,
                    path.join( options.relativeTo, el.attribs[ attr ], ".." + path.sep ) )
            } ) ).then( function( content ) {
                // Convert to style elent
                el.type = "style";
                el.name = "style";
                el.attribs = { type: "text/css" };
                return el.children = createTextChild( content );
            } );
        }

        if ( el.name === "script" ) {
            el.type = "script";
            el.attribs = { type: "text/javascript" };
            return el.children = createTextChild( content );
        }

        if ( el.name === "use" &&
            el.attribs[ attr ].split( "#" ).length === 2 ) {
            return svg(
                content,
                el.attribs[ attr ].split( "#" )[1]
            ).then( function( svgElement ) {
                el.attribs = {};
                for ( var prop in svgElement ) {
                    if ( {}.hasOwnProperty.call( svgElement, prop ) ) {
                        el[prop] = svgElement[prop];
                    }
                }
            } );
        }
    }

    function resolveElements( elements, source, content ) {
        return Promise.all( elements.map( function( el ) {
            return Promise.all( sourceAttributes.map( function( attr ) {
                if ( !el.attribs[ attr ] ) {
                    return;
                }
                if ( normalizeSource( el.attribs[ attr ] ) === source &&
                    validateElement( el, attr ) ) {
                    return replaceContent( el, attr, content );
                }
                return;
            } ) );
        } ) );
    }

    var promise = new Promise( function( resolve, reject ) {

        var handler = new htmlparser.DomHandler( function ( err, dom ) {
            if ( err ) {
                return reject( err );
            } else {
                return resolve( dom );
            }
        } );

        var parser = new htmlparser.Parser( handler );
        parser.write( options.fileContent );
        parser.end();

    } ).then( function( dom ) {
        var elements = [
            "script", "link", "img", "use"
        ].reduce( function( result, type ) {
            return result.concat(
                htmlparser.DomUtils.getElementsByTagName( type, dom ) );
        }, [] );

        // Gather and flatten sources
        var sources = elements.map( getElementSources )
        .reduce( function( result, source ) {
            result[ normalizeSource( source[0] ) ] = source;
            return result;
        }, {} );

        return Promise.all( Object.keys( sources ).map( function( src ) {
            if ( !sources[src].length ) {
                return;
            }


            return resolveSource.apply( this, sources[src] )
            .then( function( source ) {
                if ( !source || source.length != 2 ) {
                    return;
                }

                return resolveElements(
                    elements, source[0], source[1] );
            } );
        } ) ).then( function() {
            // Re-construct HTML
            return htmlparser.DomUtils.getOuterHTML( dom );
        } );

    } ).then( function( result ) {
        if ( isFunction( callback ) ) {
            callback( null, result );
        }
        return result;
    } ).catch( function( err ) {
        if ( isFunction( callback ) ) {
            callback( err, options.fileContent );
        }
        return Promise.reject( err );
    } );

    if ( !isFunction( callback ) ) {
        return promise;
    }
};
