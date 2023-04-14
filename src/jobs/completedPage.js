import * as R from 'ramda';

import {JobResultsTable, GrnaJobResultsTable} from './resultsTable';
import {GenomeBrowser} from './genomeBrowser';

import {immutableSetState} from '../utils';

import axios from 'axios';
import { saveAs } from 'file-saver';

import {getJobResults} from './rest';
import {useParams} from 'react-router-dom';
import React, {useState, useEffect} from 'react';

import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';
import Button from 'react-bootstrap/Button';
import Dropdown from 'react-bootstrap/Dropdown';
import DropdownButton from 'react-bootstrap/DropdownButton';
import Container from 'react-bootstrap/Container';

function downloadResults(id, format, extension) {
  saveAs(`/backend/job/result/${format}/${id}`, `results.${extension}`)
}

const JobResultsState = {
  PENDING:  1,
  ERROR:    2,
  RECEIVED: 3,
};

function JobCompletedPage(props) {
    const [show_results, updateShowResults] = useState(false);
    const [organism, updateOrganism] = useState(null);
    const [coords, updateCoords] = useState(null);
    const [results_state, updateResultsState] = useState(JobResultsState.PENDING);
    const [results, updateResults] = useState(null);

    useEffect(() => {
        function onLoadSuccess(response) {
            if (props.jobType === "standard") {
                updateOrganism(response.data[0][0].organism);
                const genomicRegion = response.data[0][0];
                const defaultCoordsString = genomicRegion["chromosome-name"] + ":" + genomicRegion["coords"][1] + "-" + genomicRegion["coords"][2];
                updateCoords(defaultCoordsString);
            } else if (props.jobType == "grna") {
                updateOrganism(response.data[0].organism);
            }
            updateResults(response.data);
            updateResultsState(JobResultsState.RECEIVED);
        }

        function onLoadFailure(response) {
            updateResultsState(JobResultsState.ERROR);
        }
        
        getJobResults(onLoadSuccess, onLoadFailure, 'json', props.id);
    }, [props.id]);

    const center_style = {textAlign: "center"};

    const showResultsButton = (
      <Button 
        style={{margin: "1em"}}
        variant="primary" onClick={() => updateShowResults(!show_results)}>
        {show_results ? "Show results" : "Hide results"}
      </Button>
    );

    const downloadResultsButton = (
      <DropdownButton
        style={{margin: "1em"}}
        id="dropdown-basic-button" title="Download results" download>
        <Dropdown.Item onClick={() => downloadResults(props.id, "json", "json")}>
          as json...
        </Dropdown.Item>
        <Dropdown.Item onClick={() => downloadResults(props.id, "csv", "csv")}>
          as csv...
        </Dropdown.Item>
        <Dropdown.Item onClick={() => downloadResults(props.id, "excel", "xlsx")}>
          as excel...
        </Dropdown.Item>
        <Dropdown.Item onClick={() => downloadResults(props.id, "bed", "bed")}>
          as bed...
        </Dropdown.Item>
      </DropdownButton>
    );

    let rendering =  null;

    if (!show_results) {
      if (props.jobType === "grna") {
        rendering = (
          <GrnaJobResultsTable id={props.id} organism={organism} resultsState={results_state} results={results}/>
        );
      } else if (props.jobType === "library") {
        rendering = null;
      } else {
        rendering = (
          <>
            {
              (organism && coords) ? (
                <GenomeBrowser id={props.id} organism={organism} coords={coords}/>
              ) : null
            }
            <hr/> 
            <JobResultsTable id={props.id} organism={organism} resultsState={results_state} results={results}/>
          </>
        );
      }
    }
    
    return (
      <Container>
        <h2 style={center_style}>Job Results</h2>
        <Row className="justify-content-md-center">
          <Col className="col-sm-auto">{(props.jobType === "library") ? null : showResultsButton}</Col>
          <Col className="col-sm-auto">{downloadResultsButton}</Col>
        </Row>
        {(rendering ? (
          <>
            <hr/>
            {rendering}
          </>) : null)}
      </Container>
    );
  }

export {JobCompletedPage};
