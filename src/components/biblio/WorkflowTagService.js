// src/services/workflowTagService.js
import { api } from '../../api';
import { isSuccess } from '../../api/responseShim';

/**
 * Update an existing workflow tag.
 * @param {string|number} id  the reference_workflow_tag_id
 * @param {{ workflow_tag_id?: string }} data
 */
export async function patchWorkflowTag(id, data) {
  const res = await api.patch(`/workflow_tag/${id}`, data);
  if (!isSuccess(res.status)) {
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
  if (!isSuccess(res.status)) {
    throw new Error(`DELETE /workflow_tag/${id} failed with status ${res.status}`);
  }
  return res.data;
}

/**
 * Transition a workflow tag to a new status using the transition API.
 * This validates that the transition is allowed and executes any associated actions.
 * @param {{ curie_or_reference_id: string, mod_abbreviation: string, new_workflow_tag_atp_id: string, transition_type?: string }} data
 */
export async function transitionWorkflowTag(data) {
  const payload = {
    curie_or_reference_id: data.curie_or_reference_id,
    mod_abbreviation: data.mod_abbreviation,
    new_workflow_tag_atp_id: data.new_workflow_tag_atp_id,
    transition_type: data.transition_type || 'manual'
  };
  const res = await api.post('/workflow_tag/transition_to_workflow_status', payload);
  if (!isSuccess(res.status)) {
    throw new Error(`POST /workflow_tag/transition_to_workflow_status failed with status ${res.status}`);
  }
  return res.data;
}
