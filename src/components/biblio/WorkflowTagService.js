// src/services/workflowTagService.js
import { api } from '../../api';

/**
 * Create a new workflow tag for a reference.
 * @param {{ reference_curie: string, mod_abbreviation: string, workflow_tag_id: string }} data
 */
export async function postWorkflowTag(data) {
  const res = await api.post('/workflow_tag/', data);
  if (res.status !== 201) {
    throw new Error(`POST /workflow_tag failed with status ${res.status}`);
  }
  return res.data;
}

/**
 * Update an existing workflow tag.
 * @param {string|number} id  the reference_workflow_tag_id
 * @param {{ workflow_tag_id?: string }} data
 */
export async function patchWorkflowTag(id, data) {
  const res = await api.patch(`/workflow_tag/${id}`, data);
  if (res.status !== 202) {
    throw new Error(`PATCH /workflow_tag/${id} failed with status ${res.status}`);
  }
  return res.data;
}

/**
 * Delete an existing workflow tag.
 * @param {string|number} id  the reference_workflow_tag_id
 */
export async function deleteWorkflowTag(id) {
  const res = await api.delete(`/workflow_tag/${id}`);
  if (res.status !== 204) {
    throw new Error(`DELETE /workflow_tag/${id} failed with status ${res.status}`);
  }
  return res.data;
}
