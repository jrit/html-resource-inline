module.exports = function( url ) {
    return /^'?https?:\/\/|^\/\//.test( url );
};
