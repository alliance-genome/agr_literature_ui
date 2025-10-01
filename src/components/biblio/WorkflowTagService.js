// src/services/workflowTagService.js
import axios from 'axios';

/**
 * Create a new workflow tag for a reference.
 * @param {{ reference_curie: string, mod_abbreviation: string, workflow_tag_id: string }} data
 * @param {string} accessToken
 */
export async function postWorkflowTag(data, accessToken) {
  const url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/`;
  const res = await axios.post(url, data, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status !== 201) {
    throw new Error(`POST /workflow_tag failed with status ${res.status}`);
  }
  return res.data;
}

/**
 * Update an existing workflow tag.
 * @param {string|number} id  the reference_workflow_tag_id
 * @param {{ workflow_tag_id?: string }} data
 * @param {string} accessToken
 */
export async function patchWorkflowTag(id, data, accessToken) {
  const url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/${id}`;
  const res = await axios.patch(url, data, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status !== 202) {
    throw new Error(`PATCH /workflow_tag/${id} failed with status ${res.status}`);
  }
  return res.data;
}

/**
 * Delete an existing workflow tag.
 * @param {string|number} id  the reference_workflow_tag_id
 * @param {string} accessToken
 */
export async function deleteWorkflowTag(id, accessToken) {
  const url = `${process.env.REACT_APP_RESTAPI}/workflow_tag/${id}`;
  const res = await axios.delete(url, {
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
  });
  if (res.status !== 204) {
    throw new Error(`DELETE /workflow_tag/${id} failed with status ${res.status}`);
  }
  return res.data;
}
