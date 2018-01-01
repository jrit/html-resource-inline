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

describe( "remote", function()
{
    this.timeout(5000);

    describe( "html", function()
    {
        describe( "links", function()
        {
            it( "should inline remote links", function( done )
            {
                var expected = readFile( "test/cases/css-remote_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/css-remote.html" ),
                        relativeTo: "test/cases/"
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should inline remote links with no protocol", function( done )
            {
                var expected = readFile( "test/cases/css-remote-no-protocol_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/css-remote-no-protocol.html" ),
                        relativeTo: "test/cases/"
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should inline remote links relative to a url", function( done )
            {
                var expected = readFile( "test/cases/css-remote-relative-to-url_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/css-remote-relative-to-url.html" ),
                        relativeTo: "https://raw.githubusercontent.com/jrit/"
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should inline local and remote multiline links", function( done )
            {
                var expected = readFile( "test/cases/css-multiline_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/css-multiline.html" ),
                        relativeTo: "test/cases/"
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
            it( "should inline remote images", function( done )
            {
                var expected = readFile( "test/cases/img-remote_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/img-remote.html" ),
                        relativeTo: "test/cases/",
                        images: true
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );

            it( "should inline images in one line", function( done )
            {
                var expected = readFile( "test/cases/img-singleline_out.html" );

                inline.html( {
                        fileContent: readFile( "test/cases/img-singleline.html" ),
                        relativeTo: "test/cases/",
                        images: true
                    },
                    function( err, result )
                    {
                        testEquality( err, result, expected, done );
                    }
                );
            } );
        } );

        it( "should pass HTTP errors up through callbacks when strict", function( done )
        {
            inline.html( {
                    fileContent: readFile( "test/cases/404.html" ),
                    relativeTo: "test/cases/",
                    strict: true
                },
                function( err, result )
                {
                    assert.equal( err.message, "https://raw.githubusercontent.com/not-a-file.css returned http 400" );
                    done();
                }
            );
        } );

        it( "should console.warn HTTP errors when not strict", function( done )
        {
            var expected = readFile( "test/cases/404.html" );

            inline.html( {
                    fileContent: readFile( "test/cases/404.html" ),
                    relativeTo: "test/cases/"
                },
                function( err, result )
                {
                    assert.equal( result, expected );
                    assert.equal( !!err, false );
                    done();
                }
            );
        } );
    } );

    describe( "css", function()
    {
        it( "should inline remote urls", function( done )
        {
            var expected = readFile( "test/cases/css-remote_out.css" );

            inline.css( {
                    fileContent: readFile( "test/cases/css-remote.css" ),
                    relativeTo: "test/cases/",
                    images: true
                },
                function( err, result )
                {
                    testEquality( err, result, expected, done );
                }
            );
        } );
    } );
} );
