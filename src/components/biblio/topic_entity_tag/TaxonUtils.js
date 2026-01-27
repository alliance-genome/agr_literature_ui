import { api } from '../../../api';

export const getModToTaxon = async () => {
  try {
    const response = await api.get('/mod/taxons/all');

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

export const getCurieToNameTaxon = async () => {
  const taxonData = await getModToTaxon();

  // flatten into an array of taxon IDs
  // add "NCBITaxon:9606" for human
  const allTaxons = Object.values(taxonData).flat().concat("NCBITaxon:9606");

  // make them unique
  const uniqueTaxonIDs = [...new Set(allTaxons)];
  const taxonToNameMapping = { "": "" };
  try {
    const requests = uniqueTaxonIDs.map(async (taxonID) => {
      const url = `/ontology/search_species/${encodeURIComponent(taxonID)}`;
      const response = await api.get(url);
      // this endpoint returns something like: [{ curie: "...", name: "..." }]
      const data = response.data;

      if (Array.isArray(data)) {
        for (const obj of data) {
          if (obj.curie && obj.name) {
            taxonToNameMapping[obj.curie] = obj.name;
          }
        }
      }
    });

    // Wait for all requests to finish
    await Promise.all(requests);
    if (
      Object.keys(taxonToNameMapping).filter((key) => key !== "").length < 8
    ) {
      return fallbackTaxonCurieToNameMapping();
    }
    return taxonToNameMapping;
  } catch (error) {
    console.error("Failed to fetch Curie to Name Taxon data", error);
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

export const getTaxonData = async () => {
  const modToTaxonData = await getModToTaxon();

  // Build curieToName mapping from the modToTaxon data
  const allTaxons = Object.values(modToTaxonData).flat().concat("NCBITaxon:9606");
  const uniqueTaxonIDs = [...new Set(allTaxons)];
  const taxonToNameMapping = { "": "" };

  try {
    const requests = uniqueTaxonIDs.map(async (taxonID) => {
      const url = `/ontology/search_species/${encodeURIComponent(taxonID)}`;
      const response = await api.get(url);
      const data = response.data;
      if (Array.isArray(data)) {
        for (const obj of data) {
          if (obj.curie && obj.name) {
            taxonToNameMapping[obj.curie] = obj.name;
          }
        }
      }
    });

    await Promise.all(requests);
    if (Object.keys(taxonToNameMapping).filter((key) => key !== "").length < 8) {
      return {
        curieToName: fallbackTaxonCurieToNameMapping(),
        modToTaxon: modToTaxonData
      };
    }
    return {
      curieToName: taxonToNameMapping,
      modToTaxon: modToTaxonData
    };
  } catch (error) {
    console.error("Failed to fetch Curie to Name Taxon data", error);
    return {
      curieToName: fallbackTaxonCurieToNameMapping(),
      modToTaxon: modToTaxonData
    };
  }
};
