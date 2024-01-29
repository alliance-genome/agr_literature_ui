
// function to handle the force insertion click event
export function handleForceInsertionClick(tagData, accessToken, accessLevel, dispatch, updateButtonBiblioEntityAdd, event) {
    // change the background color when it the button is clicked
    if (event && event.target) {
        event.target.style.backgroundColor = 'lightblue';
    }
    Object.keys(tagData).forEach(key => {
	if (key.endsWith('_name')) {
            delete tagData[key];
	}
    });
    tagData['reference_curie'] = tagData['reference_id'];
    delete tagData['reference_id'];
    delete tagData['created_by'];
    delete tagData['updated_by'];
    console.log("tagData=", JSON.stringify(tagData));
    const subPath = 'topic_entity_tag/';
    const method = 'POST';
    let data = [accessToken, subPath, tagData, method];
    try {
	dispatch(updateButtonBiblioEntityAdd(data, accessLevel));
    } catch(error) {
	console.error("Error processing entry: ", error);
    }
    // remove the button after the data has been submitted
    if (event && event.target) {
	event.target.remove();
    }
}

// function to set up event listeners for the dynamically generated buttons
export function setupEventListeners(existingTagResponses, accessToken, accessLevel, dispatch, updateButtonBiblioEntityAdd) {
    existingTagResponses.forEach((tagResponse, index) => {
        const button = document.getElementById(`forceInsertionBtn-${index}`);
        if (button) {
            const tagData = tagResponse.data;
            button.addEventListener('click', function(event) {
                handleForceInsertionClick(tagData, accessToken, accessLevel, dispatch,
					  updateButtonBiblioEntityAdd, event);
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
