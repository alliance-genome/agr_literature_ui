import { api } from '../../../api';

export async function fetchNote(url) {
    let note = '';
    try {
        let response = await api.get(url);
        note = response.data.note;
    } catch (error) {
        console.error("Error processing entry: ", error);
    }
    return note;
};

// assuming fetchNote is an async function that returns a note from the database
export async function fetchNoteAndAppend(url, additionalNote) {
    let noteFromDb = '';
    try {
        // await the asynchronous operation to complete and get the note
        noteFromDb = await fetchNote(url);
    } catch (error) {
        console.error("Error fetching note: ", error);
    }
    console.log("noteFromDb=", noteFromDb);
    console.log("additionalNote=", additionalNote);
    if (noteFromDb) {
	return noteFromDb + " | " + additionalNote;
    } else {
	return additionalNote;
    }
}


// function to handle the force insertion click event
export function handleForceInsertionUpdateClick(tagResponse, accessLevel, dispatch, updateButtonBiblioEntityAdd, event, updateType) {
    const tagData = tagResponse.data;

    // change the background color when it the button is clicked
    if (event && event.target) {
        event.target.style.backgroundColor = 'lightblue';
    }
    Object.keys(tagData).forEach(key => {
	if (key.endsWith('_name')) {
            delete tagData[key];
	}
    });

    if (updateType === 'updateNote') {
	/*
	if (tagResponse.status.startsWith("exists:")) {
            let trimmedStr = tagResponse.status.substring(tagResponse.status.indexOf(':') + 1).trim();
            let parts = trimmedStr.split(' | ');
            note_in_db = parts[1] === undefined ? '' : parts[1];
	}
	*/
	const url = "/topic_entity_tag/" + tagData['topic_entity_tag_id'];
        (async () => {
            try {
                const updated_note = await fetchNoteAndAppend(url, tagData['note']);
                console.log("updated_note=", updated_note);

                let tagDataWithUpdatedNote = { 'note': updated_note };

                // Ensure this api call is awaited as well
                await api.patch(url, tagDataWithUpdatedNote);

                // Dispatch a custom event after successful update
                window.dispatchEvent(new CustomEvent('noteUpdated', { detail: { updated: true } }));
            } catch (error) {
                console.error("Error processing entry: ", error);
            }
        })();
    }
    else {
	// tagData['reference_curie'] = tagData['reference_id'];
	tagData['force_insertion'] = 1;
	delete tagData['reference_id'];
	delete tagData['created_by'];
	delete tagData['updated_by'];
	delete tagData['topic_entity_tag_id']
	console.log("tagData=", JSON.stringify(tagData));
	const subPath = 'topic_entity_tag/';
	const method = 'POST';
	let data = [null, subPath, tagData, method];
	try {
	    dispatch(updateButtonBiblioEntityAdd(data, accessLevel));
	} catch(error) {
	    console.error("Error processing entry: ", error);
	}
    }
}

// function to set up event listeners for the dynamically generated buttons
export function setupEventListeners(existingTagResponses, accessLevel, dispatch, updateButtonBiblioEntityAdd) {
    existingTagResponses.forEach((tagResponse, index) => {
        const insertionButton = document.getElementById(`forceInsertionBtn-${index}`);
        const updateNoteButton = document.getElementById(`updateNoteBtn-${index}`);

        const removeButtons = () => {
            if (insertionButton) insertionButton.remove();
            if (updateNoteButton) updateNoteButton.remove();
        };

        if (insertionButton) {
            insertionButton.addEventListener('click', function(event) {
                handleForceInsertionUpdateClick(tagResponse, accessLevel, dispatch,
						updateButtonBiblioEntityAdd, event, "forceInsertion");
                removeButtons();
            });
        }

        if (updateNoteButton) {
            updateNoteButton.addEventListener('click', function(event) {
                handleForceInsertionUpdateClick(tagResponse, accessLevel, dispatch,
						updateButtonBiblioEntityAdd, event, "updateNote");
                removeButtons();
            });
        }
    });
}

// function to check for existing tags and generate an HTML table
export const checkForExistingTags = async (forApiArray, accessLevel, dispatch, updateButtonBiblioEntityAdd) => {
    let existingTagResponses = [];
    for (const arrayData of forApiArray.values()) {
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
                let value = tag[header] === undefined ? '' : tag[header];
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
                action_button_html = `<button id="forceInsertionBtn-${index}" class="force-insertion-btn" style="margin-bottom: 5px;" variant="outline-primary" size="sm">Force Insertion</button>`;
		if (tagResponse.message.startsWith("The tag with")) {
		    action_button_html += `<button id="updateNoteBtn-${index}" class="update-note-btn" variant="outline-secondary" size="sm">Update Note</button>`;
		}
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
