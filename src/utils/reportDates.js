/**
 * Formatting for the YYYYMMDD datestamps carried by the QC report logs.
 *
 * The report generators stamp each run as an unseparated eight-digit date, both
 * in the file's `#!date-produced:` header and in the archived filename, so both
 * the "Date Produced" line and the report-date selector need to render the same
 * value readably.
 */
export const convertDate = (date) => {
    if (date){
        return date.replace(/(\d{4})(\d{2})(\d{2})/, "$1-$2-$3")
    } else {
        return null
    }
}
