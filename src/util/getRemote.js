var request = require( "request" );

module.exports = function getRemote( uri, settings, callback, toDataUri )
{
    if( /^\/\//.test( uri ) ) {
        uri = "https:" + uri;
    }

    var requestOptions = {
        uri: uri,
        encoding: toDataUri ? "binary" : "",
        gzip: true
    };

    if( typeof settings.requestTransform === "function" ) {
        var transformedOptions = settings.requestTransform( requestOptions );
        if( transformedOptions === false ) {
            return callback();
        }
        if( transformedOptions === undefined ) {
            return callback( new Error( uri + " requestTransform returned `undefined`" ) );
        }
        requestOptions = transformedOptions || requestOptions;
    }

    request(
        requestOptions,
        function( err, response, body ) {
            if( err )
            {
                return callback( err );
            }
            else if( response.statusCode !== 200 )
            {
                return callback( new Error( uri + " returned http " + response.statusCode ) );
            }

            if( toDataUri )
            {
                var b64 = new Buffer( body.toString(), "binary" ).toString( "base64" );
                var datauriContent = "data:" + response.headers[ "content-type" ] + ";base64," + b64;
                return callback( null, datauriContent );
            }
            else
            {
                return callback( null, body );
            }
        } );
};
