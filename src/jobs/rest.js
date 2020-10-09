import {immutableSetState} from 'utils.js';

import axios from 'axios';

/*
  Functions that access the server's REST API for us, returning cancel
  tokens that can be used to cancel the request if necessary.
*/

function submitQuery(success_callback, error_callback, data) {
  let formData = new FormData();

  formData.append("organism", data.organism);
  formData.append("enzyme", data.enzyme);
  formData.append("query-text", data.query_text);
  formData.append("filter-annotated", data.filter_annotated_grnas);
              
  const mode = data.flanking.enabled ? "flanking" : "within";
  formData.append("mode", mode);

  if (data.flanking.enabled) {
    formData.append("flanking-value", data.flanking.value);
    formData.append("flanking", true);
  }

  if (data.top_n.enabled) {
    formData.append("topn-value", data.top_n.value);
    formData.append("topn", true);
  }

  if (data.fileInput.current.files.length > 0) {
    formData.append("query-file-upload", data.fileInput.current.files[0]);
  }

  const source = axios.CancelToken.source();
  axios.post('http://localhost:8000/query', formData, {
    cancelToken: source.token,
    headers: {
      'Content-Type': 'multipart/form-data'
    }
  }).then(success_callback)
    .catch(error_callback);
  return source;
}

function getJobStatus(success_callback, error_callback, job_id) {
  const source = axios.CancelToken.source();
  axios.get('http://localhost:8000/job/status/' + job_id, {
    cancelToken: source.token
  }).then(success_callback)
    .catch(error_callback);
  return source;
}

function getJobResults(success_callback, error_callback, format, job_id) {
  const source = axios.CancelToken.source();
  axios.get('http://localhost:8000/job/result/' + format + '/' + job_id, {
    cancelToken: source.token
  }).then(success_callback)
    .catch(error_callback);
  return source;
}

export {getJobResults, getJobStatus, submitQuery};
