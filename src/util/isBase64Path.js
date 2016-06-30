module.exports = function( url ) {
    return /^'?data.*base64/.test( url );
};
