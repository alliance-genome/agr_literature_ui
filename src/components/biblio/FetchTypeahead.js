import axios from "axios";
export const FetchTypeaheadOptions = async (url, query, accessToken) => {
    try {
        const response = await axios.post(
            url,
            {
                "searchFilters": {
                    "nameFilter": {
                        "name": {
                            "queryString": query,
                            "tokenOperator": "AND"
                        }
                    }
                },
                "sortOrders": [],
                "aggregations": [],
                "nonNullFieldsTable": []
            },
            {
                headers: {
                    'content-type': 'application/json',
                    'authorization': 'Bearer ' + accessToken
                }
            }
        );
        return response.data.results;
    } catch (error) {
        console.error("Error fetching typeahead options:", error);
        return [];
    }
};
