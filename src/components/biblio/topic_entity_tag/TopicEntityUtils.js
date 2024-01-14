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

    let tagExistingMessage = '';
    if (existingTags.length > 0) {
        tagExistingMessage = existingTags.length > 1
            ? "The following tags already exist in the database:"
            : "The following tag already exists in the database:";
        tagExistingMessage += existingTags.map(tag => "\n" + JSON.stringify(tag, null, 2)).join("");
    }

    return tagExistingMessage;
}
