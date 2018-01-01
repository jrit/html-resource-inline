/*eslint-env mocha */
/*eslint no-unused-vars: [2, { "args": "none" }]*/
var assert = require( "assert" );
var fs = require( "fs" );
var path = require( "path" );
var inline = require( "../src/inline.js" );
var util = require( "../src/util.js" );
var fauxJax = require( "faux-jax" );
var mime = require( "mime-types" );

var testEquality = require( "./lib/util" ).testEquality;
var readFile = require( "./lib/util").readFile;

describe( "local", function()
{
    var rootBaseUrl = "http://example.com/";
    var rootExternalBaseUrl = "http://example-external.com/"
    var baseUrl;
    var externalBaseUrl;

    beforeEach( function()
    {
        baseUrl = rootBaseUrl;
        externalBaseUrl = rootExternalBaseUrl;

        fauxJax.install();
        fauxJax.on( "request", function( request )
        {
            var localPathIndex = ( request.requestURL.indexOf( rootBaseUrl.replace( "http:", "" ) ) !== -1)
                && rootBaseUrl.length;

            var externalPathIndex = ( request.requestURL.indexOf( externalBaseUrl.replace( "http:", "" ) ) !== -1)
                && externalBaseUrl.length;

            if (!localPathIndex && !externalPathIndex)
            {
                throw new Error( "fauxJax requestURL did not contain local or external domain" );
            }

            var relativePath = request.requestURL
                .slice( localPathIndex || externalPathIndex )
                .replace( /\?.*/, "" );

            var headers = {
                "Content-Type": mime.contentType( path.extname( relativePath ) ) || "application/octet-stream"
            };

            var storageDir = localPathIndex ? "test/cases/" : "test/cases/external/";

            try
            {
                var content = fs.readFileSync( storageDir + relativePath );
                request.respond( 200, headers, content );
            }
            catch ( err )
            {
                if ( err.code === "ENOENT" )
                {
                    request.respond( 404, headers);
                }
                else
                {
                    throw err;
                }
            }
        } );
    } );

    afterEach( function()
    {
        fauxJax.restore();
    } );

    describe( "html", function()
    {
        describe( "links", function()
        {
            it( "should inline local links", function( done )
            {
                var expected = readFile( "test/cases/css_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/css.html" ),
                        relativeTo: baseUrl
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should keep data: uris as-is", function( done )
            {
                var expected = readFile( "test/cases/data-uri.html" );

                inline.html( {
                        fileContent: expected,
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should transform links", function( done )
            {
                var expected = readFile( "test/cases/css-transform_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/css-transform.html" ),
                        relativeTo: baseUrl,
                        linkTransform: function( content, done )
                        {
                            done( null, "/*inserted*/\n" + content );
                        }
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should rebase inline local links relative to", function( done )
            {
                var expected = readFile( "test/cases/css-rebase_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/css-rebase.html" ),
                        relativeTo: baseUrl,
                        rebaseRelativeTo: "assets/fonts"
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should resolve relative paths inside absolute src links that are a level lower than the base url", function ( done )
            {
                baseUrl += "en/";

                inline.html( {
                    fileContent: readFile( "test/cases/absolute-link.html" ),
                    relativeTo: baseUrl,
                    links: true,
                    images: true,
                    requestTransform: function ( req )
                    {
                        if ( req.uri.indexOf( "icon.png" ) !== -1 )
                        {
                            assert.equal( req.uri, rootBaseUrl + "assets/icon.png" )
                            done();
                        }

                        return req;
                    }
                }, function( err, result )
                {
                    if (err) {
                        throw err;
                    }
                });
            } );

            it( "should resolve relative paths inside relative src links that are a level lower than the base url", function ( done )
            {
                baseUrl += "en/";

                inline.html( {
                    fileContent: readFile( "test/cases/down-path-link.html" ),
                    relativeTo: baseUrl,
                    links: true,
                    images: true,
                    requestTransform: function ( req )
                    {
                        if ( req.uri.indexOf( "icon.png" ) !== -1 )
                        {
                            assert.equal( req.uri, rootBaseUrl + "assets/icon.png" )
                            done();
                        }

                        return req;
                    }
                }, function( err, result )
                {
                    if (err) {
                        throw err;
                    }
                });
            } );

            it( "should resolve relative images in stylesheets that are on a different domain", function ( done )
            {
                var expected = readFile( "test/cases/stylesheet-external-domain_out.html" );

                inline.html( {
                    fileContent: readFile( "test/cases/stylesheet-external-domain.html" ),
                    relativeTo: baseUrl,
                    links: true,
                    images: true
                }, function( err, result )
                {
                    testEquality( err, result, expected, done );
                });
            } );

            it( "should resolve root (/) relative images in stylesheets that are on a different domain", function ( done )
            {
                var expected = readFile( "test/cases/stylesheet-external-domain_out.html" );

                inline.html( {
                    fileContent: readFile( "test/cases/stylesheet-external-domain-root.html" ),
                    relativeTo: baseUrl,
                    links: true,
                    images: true
                }, function( err, result )
                {
                    testEquality( err, result, expected, done );
                });
            } );

            it( "should resolve absolute links without a protocol (//) on the same domain", function ( done )
            {
                inline.html( {
                    fileContent: "<link href=\"//example.com/assets/simple.css\" rel=\"stylesheet\"/>",
                    relativeTo: baseUrl,
                    links: true
                }, function(err, result)
                {
                    if ( err )
                    {
                        throw err;
                    }
                    assert.notEqual( result.indexOf( "body{font-weight: bold;}" ), -1 );
                    done();
                } );
            } );

            it( "should resolve absolute links without a protocol (//) on an external domain", function ( done )
            {
                inline.html( {
                    fileContent: "<link href=\"//example-external.com/css/simple.css\" rel=\"stylesheet\"/>",
                    relativeTo: baseUrl,
                    links: true
                }, function(err, result)
                {
                    if ( err )
                    {
                        throw err;
                    }
                    assert.notEqual( result.indexOf( "body{font-weight: bold;}" ), -1 );
                    done();
                } );
            } );
        } );

        describe( "scripts", function()
        {
            it( "should inline scripts", function( done )
            {
                var expected = readFile( "test/cases/script_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/script.html" ),
                        relativeTo: baseUrl
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should inline multiline scripts", function( done )
            {
                var expected = readFile( "test/cases/script-multiline_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/script-multiline.html" ),
                        relativeTo: baseUrl
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should transform scripts", function( done )
            {
                var expected = readFile( "test/cases/script-transform_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/script-transform.html" ),
                        relativeTo: baseUrl,
                        scriptTransform: function( content, done )
                        {
                            done( null, content );
                        }
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );
        } );

        describe( "images", function()
        {
            it( "should inline local images", function( done )
            {
                var expected = readFile( "test/cases/img_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/img.html" ),
                        relativeTo: baseUrl,
                        images: true
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should include based on size", function( done )
            {
                var expected = readFile( "test/cases/img-opt-out_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/img-opt-out.html" ),
                        relativeTo: baseUrl,
                        images: 8
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should exclude based on size", function( done )
            {
                var expected = readFile( "test/cases/img-too-large_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/img-too-large.html" ),
                        relativeTo: baseUrl,
                        images: 0.1
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should use the base url (relativeTo) to resolve image URLs", function( done )
            {
                var expected = readFile( "test/cases/img_out.html" );
                inline.html( {
                    fileContent: readFile( "test/cases/img.html" ),
                    relativeTo: baseUrl,
                    images: true
                }, function( err, result )
                {
                    testEquality( err, result, expected, done );
                } );
            } );
        } );

        describe( "svgs", function()
        {
            it( "should inline local svgs", function( done )
            {
                var expected = readFile( "test/cases/svg/svg_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/svg/svg.html" ),
                        relativeTo: baseUrl,
                        svgs: true
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should include based on size", function( done )
            {
                var expected = readFile( "test/cases/svg/svg-opt-out_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/svg/svg-opt-out.html" ),
                        relativeTo: baseUrl,
                        svgs: 8
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should exclude based on size", function( done )
            {
                var expected = readFile( "test/cases/svg/svg-too-large_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/svg/svg-too-large.html" ),
                        relativeTo: baseUrl,
                        svgs: 0.1
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );
        } );

        it( "should inline based on inlineAttribute", function( done )
        {
            var expected = readFile( "test/cases/img-opt-in_out.html" );

            inline.html( {
                    fileContent: readFile( "test/cases/img-opt-in.html" ),
                    relativeTo: baseUrl,
                    images: false
                },
                function( err, result )
                {
                    testEquality( err, result, expected, done );
                }
            );
        } );

        it( "should exclude based on inlineAttribute", function( done )
        {
            var expected = readFile( "test/cases/img-opt-out_out.html" );

            inline.html( {
                    fileContent: readFile( "test/cases/img-opt-out.html" ),
                    relativeTo: baseUrl,
                    images: true
                },
                function( err, result )
                {
                    testEquality( err, result, expected, done );
                }
            );
        } );

        it( "should pass missing file errors up through callbacks when strict", function( done )
        {
            var expected = readFile( "test/cases/missing-file.html" );

            inline.html( {
                    fileContent: readFile( "test/cases/missing-file.html" ),
                    relativeTo: baseUrl,
                    strict: true
                },
                function( err, result )
                {
                    assert.equal( result, expected );
                    assert.equal( !!err, true );
                    done();
                }
            );
        } );

        it( "should console.warn missing file errors when not strict", function( done )
        {
            inline.html( {
                    fileContent: readFile( "test/cases/missing-file.html" ),
                    relativeTo: baseUrl
                },
                function( err, result )
                {
                    assert.equal( !!err, false );
                    done();
                }
            );
        } );

        it( "should properly escape regex vars before calling replace()", function( done )
        {
            inline.html( {
                    fileContent: readFile( "test/cases/script-regex-escape.html" ),
                    relativeTo: baseUrl
                },
                function( err, result )
                {
                    assert.equal( result.indexOf( "$&" ) > -1, true );
                    done();
                }
            );
        } );

        it( "should resolve image URLs when link was imported through an absolute path", function( done )
        {
            var expected = readFile( "test/cases/absolute-link_out.html" )
            inline.html( {
                fileContent: readFile( "test/cases/absolute-link.html" ),
                relativeTo: baseUrl,
                links: true,
                images: true,
                requestTransform: function( req )
                {
                    if ( req.uri.indexOf('icon.png') !== -1 )
                    {
                        assert.equal( req.uri, baseUrl + 'assets/icon.png' );
                    }
                    return req;
                }
            }, function( err, result )
            {
                testEquality( err, result, expected, done );
            } );
        } );

        it( "should not try to inline empty links", function( done )
        {
            const content = '<link href="" rel="stylesheet" />';

            inline.html( {
                    fileContent: content,
                    strict: false,
                    relativeTo: baseUrl
                },
                function( err, result )
                {
                    testEquality( err, result, content, done );
                }
            );

        } );

        it( "should respect absolute root paths inside css files", function( done )
        {
            inline.html( {
                fileContent: readFile( "test/cases/css-root-path.html" ),
                relativeTo: baseUrl,
                links: true,
                requestTransform: function( options )
                {
                    if ( options.uri.indexOf('icon.png') !== -1 )
                    {
                        assert.equal( options.uri, baseUrl + 'icon.png' );
                        done();
                    }
                    return options;
                }
            }, function( err, result )
            {
                if (err)
                {
                    throw err;
                }
            } );
        } );

        describe( "requests", function()
        {
            it( "should apply the requestTransform option", function( done )
            {
                fauxJax.on( "request", function( request )
                {
                    assert( request.requestURL.indexOf( "foo=bar" ) !== -1 );
                } );
                inline.html( {
                    fileContent: "<img src=\"assets/icon.png\"><img src=\"assets/icon.png?a=1\">",
                    relativeTo: baseUrl,
                    scripts: true,
                    links: true,
                    images: true,
                    requestTransform: function( options )
                    {
                        options.qs = {
                            foo: "bar"
                        };
                    }
                }, done );
            } );
        } );

        it( "should unescape HTML entities when extracting URLs from attributes", function( done )
        {
            fauxJax.on( "request", function( request )
            {
                assert( !/&\w+;/.test( request.url ) );
            } );
            inline.html( {
                fileContent: "<img src=\"assets/icon.png?a=b&amp;c='d'\" /><img src=\"assets/icon.png?a=b&amp;c='d'&amp;&amp;\">",
                relativeTo: baseUrl,
                images: true
            }, done );
        } );

        it( "should understand the spaces to the sides of = when parsing attributes", function( done )
        {
            var count = 0;
            fauxJax.on( "request", function( request )
            {
                count++;
            } );
            inline.html( {
                fileContent: "<img src = \"assets/icon.png\">" +
                    "<script src =\"assets/export.js\"></script>" +
                    "<script src =\n\"assets/export.js?foo=1\"></script>" +
                    "<link href=  \"assets/simple.css\" rel=\"stylesheet\"/>",
                relativeTo: baseUrl,
                scripts: true,
                links: true,
                images: true
            }, function()
            {
                assert.equal( count, 4 );
                done();
            } );
        } );
    } );

    describe( "css", function()
    {
        it( "should inline local urls", function( done )
        {
            var expected = readFile( "test/cases/css_out.css" );

            inline.css( {
                    fileContent: readFile( "test/cases/css.css" ),
                    relativeTo: baseUrl,
                    images: false
                },
                function( err, result )
                {
                    testEquality( err, result, expected, done );
                }
            );
        } );

        it( "should rebase local urls", function( done )
        {
            var expected = readFile( "test/cases/css-rebase_out.css" );

            inline.css( {
                    fileContent: readFile( "test/cases/css-rebase.css" ),
                    relativeTo: baseUrl,
                    rebaseRelativeTo: "assets",
                    images: false
                },
                function( err, result )
                {
                    testEquality( err, result, expected, done );
                }
            );
        } );
    } );

    describe( "util", function()
    {

        describe( "#escapeSpecialChars", function()
        {
            it( "should escape special regex characters in a string", function()
            {

                var str = "http://fonts.googleapis.com/css?family=Open+Sans";
                var expected = "http:\\/\\/fonts\\.googleapis\\.com\\/css\\?family=Open\\+Sans";

                var result = util.escapeSpecialChars( str );
                var regex = new RegExp( result, "g" );

                assert.equal( result, expected );
                assert.equal( str.match( regex ).length, 1 );

            } );
        } );

    } );
} );
