import axios from 'axios';

export const getModToTaxon = async () => {

  const url = `${process.env.REACT_APP_RESTAPI}/mod/taxons/all`;

  try {
	
    const headers = {
      'Content-Type': 'application/json',
    };

    const response = await axios.get(url, { headers });

    if (!Array.isArray(response.data)) {
      console.error('Unexpected response format:', response.data);
      return {};
    }

    const data = response.data.reduce((acc, item) => {
      if (item.mod_abbreviation && item.taxon_ids) {
        acc[item.mod_abbreviation] = item.taxon_ids;
      }
      return acc;
    }, {});

    return data;

  } catch (error) {
    console.error('Failed to fetch mod to tax data', error);
    return {};
  }
  /* it will return something like following                                                                                             
   return {
     'ZFIN': ['NCBITaxon:7955'],
     'FB': ['NCBITaxon:7227'],
     'WB': ['NCBITaxon:6239'],
     'RGD': ['NCBITaxon:10116'],
     'MGI': ['NCBITaxon:10090'], 
     'SGD': ['NCBITaxon:559292'],
     'XB': ['NCBITaxon:8355', 'NCBITaxon:8364']
   };
  */

};

export const getCurieToNameTaxon = async (accessToken) => {
  const taxonData = await getModToTaxon();  
  const taxon_ids = Object.values(taxonData).flat().join(' ') + ' NCBITaxon:9606';  
  const taxonToNameMapping = {'': ''};
  try {
    const response = await axios.post(
      `${process.env.REACT_APP_ATEAM_API_BASE_URL}api/ncbitaxonterm/search?limit=20&page=0`,
      {
        "searchFilters": {
          "nameFilter": {
            "curie": {
              "queryString": taxon_ids,
              "tokenOperator": "OR",
              "useKeywordFields": true,
              "queryType": "matchQuery"
            }
          }
        }
      },
      {
        headers: {
          'content-type': 'application/json',
          'authorization': 'Bearer ' + accessToken
        }
      }
    );

    // console.log("API Response:", JSON.stringify(response.data.results));

    if (response.data.results) {
      for (const entityResult of response.data.results) {
        if (entityResult.curie && entityResult.name) {
          //taxonToNameMapping[entityResult.curie] = entityResult.name.split(" NCBITaxon")[0];
	  taxonToNameMapping[entityResult.curie] = entityResult.name;  
        }
      }
    }

    if (Object.keys(taxonToNameMapping).filter(key => key !== '').length < 8) {
      return fallbackTaxonCurieToNameMapping();
    }
    return taxonToNameMapping;

  } catch (error) {
    console.error('Failed to fetch Curie to Name Taxon data', error);
    //return {};
    return fallbackTaxonCurieToNameMapping();
  }

};

export const fallbackTaxonCurieToNameMapping = () => {
    return {
        'NCBITaxon:559292': 'Saccharomyces cerevisiae',
        'NCBITaxon:6239': 'Caenorhabditis elegans',
        'NCBITaxon:7955': 'Danio rerio',
        'NCBITaxon:10116': 'Rattus norvegicus',
        'NCBITaxon:10090': 'Mus musculus',
        'NCBITaxon:8355': 'Xenopus laevis',
        'NCBITaxon:8364': 'Xenopus tropicalis',
        'NCBITaxon:9606': 'Homo sapiens',
        '': ''
    }
};

