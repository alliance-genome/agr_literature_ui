export const checkForExistingTags = async (forApiArray, accessToken, accessLevel, dispatch, updateButtonBiblioEntityAdd) => {
    let existingTags = [];
    for (const arrayData of forApiArray.values()) {
        arrayData.unshift(accessToken);
        try {
            const response = await dispatch(updateButtonBiblioEntityAdd(arrayData, accessLevel));
            if (response.status === 'exists') {
                existingTags.push(response.data);
            }
        } catch (error) {
            console.error("Error processing entry: ", error);
        }
    }

    /*
    let tagExistingMessage = '';
    if (existingTags.length > 0) {
        tagExistingMessage = existingTags.length > 1
            ? "The following tags already exist in the database:"
            : "The following tag already exists in the database:";
        tagExistingMessage += existingTags.map(tag => "\n" + JSON.stringify(tag, null, 2)).join("");
    }
    */

    let tagExistingMessage = '';
    if (existingTags.length > 0) {
	tagExistingMessage = existingTags.length > 1
            ? "The tags listed below were skipped as they already exist in the database:"
            : "The tag listed below was skipped as it already exists in the database:"; 
	// filter out keys that end with '_name'
	// const headers = Object.keys(existingTags[0]).filter(key => !key.endsWith("_name"));
	let headers = ['topic', 'entity_type', 'species', 'entity'];
	if (accessLevel === 'SGD') {
	    headers.push('display_tag')
	} else {
	    headers.push('negated')
	    headers.push('novel_topic_data')
	}
	headers.push('note')
	headers.push('created_by')
	
	// create table headers
        let tableHTML = "<table class='table table-bordered'><tr>";
	headers.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });
        tableHTML += "</tr>";
	
	// create table rows
        existingTags.forEach(tag => {
            tableHTML += "<tr>";
            headers.forEach(header => {
                let value = tag[header];
                // if there is a corresponding '_name' field, use its value instead
                if (tag.hasOwnProperty(`${header}_name`) && tag[`${header}_name`] !== null) {
                    value = tag[`${header}_name`];
                }
                tableHTML += `<td>${value !== null ? value : ''}</td>`;
            });
            tableHTML += "</tr>";
        });
        tableHTML += "</table>";
	tagExistingMessage = "<strong>" + tagExistingMessage + "</strong><p>" + tableHTML
    }

    return tagExistingMessage;
  
}
