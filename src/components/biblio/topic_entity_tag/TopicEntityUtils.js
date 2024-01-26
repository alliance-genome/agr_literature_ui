// function to handle the force insertion click event
export function handleForceInsertionClick(tag) {
    Object.keys(tag).forEach(key => {
	if (key.endsWith('_name')) {
            delete tag[key];
	}
    });
    delete tag['created_by'];
    delete tag['updated_by'];
    tag['force_insertion'] = 1;
    console.log("tag=", JSON.stringify(tag));
}

// function to set up event listeners for the dynamically generated buttons
export function setupEventListeners(existingTagResponses) {
    existingTagResponses.forEach((tagResponse, index) => {
        console.log("Tag data for button", index, ":", tagResponse.data);
        const button = document.getElementById(`forceInsertionBtn-${index}`);
        if (button) {
            const tagData = tagResponse.data;
            button.addEventListener('click', function() {
                handleForceInsertionClick(tagData);
            });
        }
    });
}

// function to check for existing tags and generate an HTML table
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

    let tagExistingMessage = '';
    if (existingTagResponses.length > 0) {
        tagExistingMessage = existingTagResponses.length > 1
            ? "The tags listed below were skipped as they already exist in the database:"
            : "The tag listed below was skipped as it already exists in the database:";

        let headers = ['topic', 'entity_type', 'species', 'entity'];
        if (accessLevel === 'SGD') {
            headers.push('display_tag');
        } else {
            headers.push('negated');
            headers.push('novel_topic_data');
        }
        headers.push('note');
        headers.push('created_by');

        let fullheaders = [...headers];
        fullheaders.push('created_by(db)');
        fullheaders.push('tag_status');
        fullheaders.push('actions');

        let tableHTML = "<table class='table table-bordered'><tr>";
        fullheaders.forEach(header => {
            tableHTML += `<th>${header}</th>`;
        });
        tableHTML += "</tr>";

        existingTagResponses.forEach((tagResponse, index) => {
            const tag = tagResponse.data; 
            tableHTML += "<tr>";
	    let creator_in_db = '';
            headers.forEach(header => {
                let value = tag[header];
                if (tag.hasOwnProperty(`${header}_name`) && tag[`${header}_name`] !== null) {
                    value = tag[`${header}_name`];
                }
		if (header === 'created_by') {
		    creator_in_db = value;
		}
                tableHTML += `<td>${value !== null ? value : ''}</td>`;
            });

            // adding button with unique ID for each tag
            let action_button_html = '';
            if (tagResponse.status.startsWith("exists:")) {
		let trimmedStr = tagResponse.status.substring(tagResponse.status.indexOf(':') + 1).trim();
		let parts = trimmedStr.split(' | ');
		creator_in_db = parts[0];
                action_button_html = `<button id="forceInsertionBtn-${index}" class="force-insertion-btn" variant="outline-primary" size="sm">Force Insertion</button>`;
            }
	    tableHTML += `<td>${creator_in_db}</td>`;
	    tableHTML += `<td>${tagResponse.message}</td>`;
            tableHTML += `<td>${action_button_html}</td>`;
            tableHTML += "</tr>";
        });
        tableHTML += "</table>";
        tagExistingMessage = "<strong>" + tagExistingMessage + "</strong><p>" + tableHTML;
    }

    return { html: tagExistingMessage, existingTagResponses };
}
