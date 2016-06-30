"use strict";

var CleanCSS = require( "clean-css" );
var path = require( "path" );

var search = require( "./util/search" );
var isFunction = require( "./util/isFunction" );
var isBase64Path = require( "./util/isBase64Path" );
var isCIDPath = require( "./util/isCIDPath" );

var isRemotePath = require( "./util/isRemotePath" );
var getFileReplacement = require( "./util/getFileReplacement" );

module.exports = function( options, callback )
{
    options = require( "./options" )( options );
    var urlRegex = /url\(\s*["']?\s*([^)'"]+)\s*["']?\s*\);\s*(\/\*[^\*]+\*\/)?/gi;

    function validateAttribute( attr ) {
        function exp( str ) {
            return new RegExp( "\\/\\*\\s*" + str + "\\s*\\*\\/", "i" );
        }
        if ( attr ) {
            return ( !exp( options.inlineAttribute + "-ignore" ).test( attr ) &&
                options.images || exp( options.inlineAttribute ).test( attr ) );
        }
        return true;
    }

    function replace( src, content ) {
        var replacement = src.replace( urlRegex, function( match, p1 ) {
            return match.replace( p1, content );
        } );

        return options.fileContent =
            options.fileContent.replace( src, replacement );
    }

    var promise = new Promise( function( resolve, reject ) {
        if ( !options.fileContent ) {
            return reject( new Error( "No file content" ) );
        }

        return resolve(
            search( urlRegex, options.fileContent
        ).reduce( function( result, src ) {
            if ( !validateAttribute( src[2] ) ||
                isBase64Path( src[1] ) ||
                isCIDPath( src[1] ) ) {
                return result;
            }

            if ( !result[ src[1] ] ) {
                result[ src[1] ] = [ src[0] ];
            } else {
                result[ src[1] ].push( src[0] );
            }
            return result;
        }, {} ) );
    } ).then( function( matches ) {
        return Promise.all( Object.keys( matches ).map( function( src ) {
            return new Promise( function( resolve, reject ) {
                var origin = src;
                if ( !isRemotePath( src ) && options.rebaseRelativeTo ) {
                    origin = path.join( options.rebaseRelativeTo, src ).replace( /\\/g, "/" );
                }

                // Replace source
                return getFileReplacement( origin, options, function( err, content ) {
                    if ( err ) {
                        if ( options.strict ) {
                            return reject( err );
                        } else {
                            console.warn( "Not found, skipping: " + src  );
                            return resolve(); // Skip
                        }
                    }
                    resolve( content );
                } );
            } ).then( function( content ) {
                if ( !content || typeof( options.images ) === "number" &&
                    content.length > options.images * 1000 ) {
                    return; // Skip
                }

                return Promise.all( matches[src].map( function( src ) {
                    return replace( src, content );
                } ) );
            } );
        } ) );
    } ).then( function() {
        options.fileContent = options.cssmin ? CleanCSS.process( options.fileContent ) : options.fileContent;
        if ( isFunction( callback ) ) {
            callback( null, options.fileContent );
        }
        return options.fileContent;
    } ).catch( function( err ) {
        if ( isFunction( callback ) ) {
            callback( err );
        }
        return Promise.reject( err );
    } );

    if ( !isFunction( callback ) ) {
        return promise;
    }
};
