export function handleForceInsertionClick(tag) {
    // Logic for handling the click event
    tag['force_insertion'] = 1;
    console.log("tag=", JSON.stringify(tag));
}

function setupEventListeners(existingTagResponses) {
    existingTagResponses.forEach((tagResponse, index) => {
	console.log("Tag data for button", index, ":", tagResponse.data); // Add this line for debugging 
        const button = document.getElementById(`forceInsertionBtn-${index}`);
        if (button) {
            const tagData = tagResponse.data;
            button.addEventListener('click', function() {
                handleForceInsertionClick(tagData);
            });
        }
    });
}

export const checkForExistingTags = async (forApiArray, accessToken, accessLevel, dispatch, updateButtonBiblioEntityAdd) => {
    let existingTagResponses = [];
    for (const arrayData of forApiArray.values()) {
        arrayData.unshift(accessToken);
        try {
            const response = await dispatch(updateButtonBiblioEntityAdd(arrayData, accessLevel));
            if (response.status.startsWith('exists')) {
                existingTagResponses.push(response);
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
    if (existingTagResponses.length > 0) {
	tagExistingMessage = existingTagResponses.length > 1
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

	let fullheaders = [...headers];
	fullheaders.push('created_by(db)')
	fullheaders.push('tag_status')
	fullheaders.push('actions')

	// create table headers
        let tableHTML = "<table class='table table-bordered'><tr>";
	fullheaders.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });
        tableHTML += "</tr>";

	const headerSubset = headers.slice(0, headers.length - 3);
	
	// create table rows
        existingTagResponses.forEach((tagResponse, index) => {
	    const tag = tagResponse.data; 
            tableHTML += "<tr>";
	    let	creator_in_db = '';
	    let action_button_html = '';
            headers.forEach(header => {
                let value = tag[header];
                // if there is a corresponding '_name' field, use its value instead
                if (tag.hasOwnProperty(`${header}_name`) && tag[`${header}_name`] !== null) {
                    value = tag[`${header}_name`];
                }
		if (header === 'created_by') {
		    creator_in_db = value;
		}
		tableHTML += `<td>${value !== null ? value : ''}</td>`;
            });
	    if (tagResponse.status.startsWith("exists:")) {
		let trimmedStr = tagResponse.status.substring(tagResponse.status.indexOf(':') + 1).trim();
		let parts = trimmedStr.split(' | ');
		creator_in_db = parts[0];
		// action_button_html = `<button style='background-color: white; color: blue; border: 2px blue; padding: 5px 10px; cursor: pointer;' onclick='handleForceInsertionClick(${JSON.stringify(tag)})'>Force Insertion</button>`;
		// action_button_html = `<button variant="outline-primary" size="sm" onclick='handleForceInsertionClick(${JSON.stringify(tag)})'>Force Insertion</button>`;
		action_button_html = `<button id="forceInsertionBtn-${index}" class="force-insertion-btn" variant="outline-primary" size="sm">Force Insertion</button>`;
	    }
	    tableHTML += `<td>${creator_in_db}</td>`;
	    tableHTML += `<td>${tagResponse.message}</td>`;
	    tableHTML += `<td>${action_button_html}</td>`;
            tableHTML += "</tr>";
        });
        tableHTML += "</table>";
	tagExistingMessage = "<strong>" + tagExistingMessage + "</strong><p>" + tableHTML
    }

    return tagExistingMessage;
  
}
