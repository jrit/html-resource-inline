module.exports = function ( re, subject ) {
    var result = [],
        matches;

    while( ( matches = re.exec( subject ) ) !== null ) {
        result.push( matches.map( function( item ) {
            return item;
        } ) );
    }

    return result;
};
