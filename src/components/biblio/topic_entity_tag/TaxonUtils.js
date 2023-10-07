export const getCurieToNameTaxon = () => {
  return {
    'NCBITaxon:559292': 'Saccharomyces cerevisiae',
    'NCBITaxon:6239': 'Caenorhabditis elegans',
    'NCBITaxon:7227': 'Drosophila melanogaster',
    'NCBITaxon:7955': 'Danio rerio',
    'NCBITaxon:10116': 'Rattus norvegicus',
    'NCBITaxon:10090': 'Mus musculus',
    'NCBITaxon:8355': 'Xenopus laevis',
    'NCBITaxon:8364': 'Xenopus tropicalis',
    'NCBITaxon:9606': 'Homo sapiens',
    '': ''
  };
};

export const getModToTaxon = () => {
  return {
    'ZFIN': ['NCBITaxon:7955'],
    'FB': ['NCBITaxon:7227'],
    'WB': ['NCBITaxon:6239'],
    'RGD': ['NCBITaxon:10116'],
    'MGI': ['NCBITaxon:10090'],
    'SGD': ['NCBITaxon:559292'],
    'XB': ['NCBITaxon:8355', 'NCBITaxon:8364']
  };
};
