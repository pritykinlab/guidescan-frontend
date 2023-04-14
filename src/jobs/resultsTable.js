import * as R from 'ramda';
import React, {useState, useEffect} from 'react';
import paginationFactory from 'react-bootstrap-table2-paginator';
import BootstrapTable from 'react-bootstrap-table-next';

import Modal from 'react-bootstrap/Modal';
import ModalHeader from 'react-bootstrap/ModalHeader';
import ModalTitle from 'react-bootstrap/ModalTitle';
import ModalBody from 'react-bootstrap/ModalBody';
import ModalFooter from 'react-bootstrap/ModalFooter';
import Button from 'react-bootstrap/Button';

import {immutableSetState} from '../utils';
import {getJobResults} from './rest';

function offTargetSummaryOld(off_targets) {
  let summary = {0: 1, 1: 0, 2:0, 3:0};
  if (!off_targets) return summary;
  off_targets.forEach((off_target) => (off_target.distance in summary)
                      ? summary[off_target.distance]++
                      : summary[off_target.distance] = 1);
  return summary;
}

function offTargetSummary(gRNA) {
    if (!("distance-0-off-targets" in gRNA)) {
        return offTargetSummaryOld(gRNA["off-targets"])
    }

    return {
        0: gRNA["distance-0-off-targets"],
        1: gRNA["distance-1-off-targets"],
        2: gRNA["distance-2-off-targets"],
        3: gRNA["distance-3-off-targets"],
        4: gRNA["distance-4-off-targets"],
    }
}

function offTargetSummaryString(gRNA) {
    const summary = offTargetSummary(gRNA);
    let first_flag = true;
    let offtargetstring = "";
    for (let k = 2; k < 6; k++) {
        if (!(k in summary)) continue;
        if (!first_flag) {
            offtargetstring += "|";
        }

        offtargetstring += k + ":" + (summary[k] || 0)
        first_flag = false;
    }

    return offtargetstring;
}
    

function grnaQueryProcessGrna(gRNA) {
  const strand = (gRNA.direction === "positive") ? "+" : "-";
  const genomicRegion = gRNA['genomic-region'];
  const coords = genomicRegion['chromosome-name'] + ":" + gRNA.start + "-" + gRNA.end + ":" + strand;
  gRNA.coordinate = coords;

  const offTargets = gRNA["off-targets"];
  const summary = offTargetSummary(gRNA);
  gRNA["num-off-targets"] = R.sum(R.values(summary)) - 1;
  gRNA["off-target-summary"] = offTargetSummaryString(gRNA);

  if (!("specificity" in gRNA)) {
    gRNA["specificity"] = "N/A";
  }

  if (!("cutting-efficiency" in gRNA)) {
    gRNA["cutting-efficiency"] = "N/A";
  }
}

function processgRNA(chr, gRNA) {
  const strand = (gRNA.direction === "positive") ? "+" : "-";
  const coords = chr + ":" + gRNA.start + "-" + gRNA.end + ":" + strand;
  gRNA.coordinate = <a className="breadcrumb-item">{coords}</a>;

  const offTargets = gRNA["off-targets"];
  const summary = offTargetSummary(gRNA);
  gRNA["num-off-targets"] = R.sum(R.values(summary)) - 1;
  gRNA["off-target-summary"] = offTargetSummaryString(gRNA);

  if (gRNA["annotations"].length > 0) {
    let annotation = gRNA["annotations"][0];
    gRNA["annotations"] = "Exon " + annotation["exons/exon_number"] + " of " + annotation["exons/product"];
  } else {
    gRNA["annotations"] = "None"
  }

  if (!("specificity" in gRNA)) {
    gRNA["specificity"] = "N/A";
  }

  if (!("cutting-efficiency" in gRNA)) {
    gRNA["cutting-efficiency"] = "N/A";
  }

}

function processResultEntry(entry) {
  const chr = entry[0]['chromosome-name']; 
  entry[1].forEach((gRNA) => processgRNA(chr, gRNA));
}

/*
  Processes the results of a /job/result/ request into a format
  suitable for a results table. Mutates the input.
*/
function processJobResults(results) {
  results.forEach((e) => processResultEntry(e));
}

function floatFormatter(precision) {
  function f(cell, row) {
    const s = Math.pow(10, precision);
    const n = Math.trunc(cell * s) / s; 
    return (
        <span>{ n.toFixed(precision) }</span>
    );
  }

  return f;
}

function offTargetCoordinatesFormatter(cell, row, rowIndex, { organism }) {
  let startPosition = null;
  let endPosition = null;
  const direction = cell.direction === "positive" ? "+" : "-";
  
  if (direction === "+") {
    startPosition = cell.position;
    endPosition   = startPosition + 23;
  } else {
    endPosition   = cell.position;
    startPosition = endPosition - 23;
  }

  const linkText = `chr${cell.chromosome}:${startPosition}-${endPosition}:${direction}`;
  const linkUrl = `https://igv.org/app/?genome=${organism}&locus=${linkText}`;

  return <a target="_blank" href={linkUrl}>{linkText}</a>;
}

const OffTargetResultsTableColumns = (organism) => {
    return [{
        dataField: 'coords',
        text: 'coordinates',
        sort: true,
        formatter: offTargetCoordinatesFormatter,
        formatExtraData: {organism: organism}
    }, {
        dataField: 'distance',
        text: 'distance',
        sort: true,
    }];
}


function OffTargetModal(props) {
  const [show, setShow] = React.useState(false);

  const handleClose = () => setShow(false);
  const handleShow = () => setShow(true);

  var offTargets = props.gRNA["off-targets"] || [];
  const organism = props.organism;

  offTargets = offTargets.map((off_target, index) => {
    return {
      id: index,
      distance: off_target.distance,
      coords: {
        position: off_target.position,
        direction: off_target.direction,
        chromosome: off_target.chromosome
      }
    }
  });

  const summary = props.gRNA["off-target-summary"];

  if (offTargets.length == 0) {
    return summary;
  }

  return (
    <>
      <a href="#" variant="primary" onClick={(e) => {e.preventDefault(); handleShow();}}>
        {summary}
      </a>

      <Modal show={show} onHide={handleClose} size='lg'>
        <Modal.Header closeButton>
          <Modal.Title>Off-targets for guideRNA targeting {props.gRNA["coordinate"]}</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <BootstrapTable keyField='id' data={offTargets}
                          striped={true} columns={OffTargetResultsTableColumns(organism)}
                          pagination={paginationFactory()} />
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={handleClose}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}

function offTargetFormatter(organism) {
    return function (cell, row) {
        return <OffTargetModal gRNA={row} organism={organism}/>;
    }
}

const JobResultsTableColumns = (organism) => {
    return [{
        dataField: 'coordinate',
        text: 'coordinate',
        sort: true
    }, {
        dataField: 'sequence',
        text: 'sequence',
        sort: true
    }, {
        dataField: 'num-off-targets',
        text: 'num-off-targets',
        sort: true,
    }, {
        dataField: 'off-target-summary',
        text: 'off-target-summary',
        formatter: offTargetFormatter(organism)
    }, {
        dataField: 'cutting-efficiency',
        text: 'cutting-efficiency',
        sort: true,
        formatter: floatFormatter(2),
    }, {
        dataField: 'specificity',
        text: 'specificity',
        sort: true,
        formatter: floatFormatter(2),
    }, {
        dataField: 'annotations',
        text: 'annotations',
        sort: true
    }];
}

const GrnaJobResultsTableColumns = (organism) => {
    return [{
        dataField: 'coordinate',
        text: 'coordinate',
        sort: true
    }, {
        dataField: 'sequence',
        text: 'gRNA',
        sort: true
    }, {
        dataField: 'num-off-targets',
        text: 'num-off-targets',
        sort: true,
    }, {
        dataField: 'off-target-summary',
        text: 'off-target-summary',
        formatter: offTargetFormatter(organism)
    }, {
        dataField: 'cutting-efficiency',
        text: 'cutting-efficiency',
        sort: true,
        formatter: floatFormatter(2),
    }, {
        dataField: 'specificity',
        text: 'specificity',
        sort: true,
        formatter: floatFormatter(2),
    }];
}

const BadGrnaJobResultsTableColumns = 
  [{
    dataField: 'sequence',
    text: 'sequence',
    sort: true
  }, {
    dataField: 'error',
    text: 'error',
  }];

const JobResultsState = {
  PENDING:  1,
  ERROR:    2,
  RECEIVED: 3,
};

function JobResultsTable(props) {
    let page = null;
    const organism = props.organism;

    switch (props.resultsState) {
    case JobResultsState.RECEIVED:
        let gRNAs = JSON.parse(JSON.stringify(props.results)); 
        processJobResults(gRNAs);
        page = gRNAs.map((queryResult) => {
          const grnaCoordsString = queryResult[0]["region-name"];
          return (
            <React.Fragment key={queryResult[0]["region-name"]}>
              <h4 style={{margin: "0.5em 0 1em 0.5em", fontStyle: "italic"}}>
                <a className="breadcrumb-item" style={{color: "black"}}>
                  {grnaCoordsString}
                </a>
              </h4>
              <BootstrapTable keyField='sequence' data={queryResult[1]}
                              striped={true}
                              columns={JobResultsTableColumns(organism)}
                              pagination={paginationFactory()} />
            </React.Fragment>
          );
        });
        break;
    case JobResultsState.ERROR:
        page = (
                <div className="alert alert-danger">
                Error loading results.
                </div>
               );
        break;
    default:
        page = (
                <div className="alert alert-warning">
                {"Job Results are currently pending..."}
                </div>
               );
    }

    return page;
}

function GrnaJobResultsTable(props) {
    let page = null;
    const organism = props.organism;
    switch (props.resultsState) {
    case JobResultsState.RECEIVED:
        let gRNAs = JSON.parse(JSON.stringify(props.results)); // Works because data comes from JSON endpoint
        let goodGrnas = [], badGrnas = [];
        for(const gRNA of gRNAs) {
            if (gRNA.error) {
                gRNA.error = gRNA.error.message;
                gRNA.sequence = gRNA.grna;
                badGrnas.push(gRNA);
            } else { 
                grnaQueryProcessGrna(gRNA);
                goodGrnas.push(gRNA);
            }
        }

        page = (
                <>
                <h4 style={{margin: "0.5em 0 1em 0.5em", fontStyle: "italic"}}>
                <a className="breadcrumb-item" style={{color: "black"}}>
                Evaluated gRNAs
                </a>
                </h4>
                <BootstrapTable keyField='sequence' data={goodGrnas}
                striped={true}
                columns={GrnaJobResultsTableColumns(organism)}/>
                {((badGrnas.length > 0) ? (
                            <>
                            <h4 style={{margin: "1.5em 0 1em 0.5em", fontStyle: "italic"}}>
                            <a className="breadcrumb-item" style={{color: "black"}}>
                            Failed gRNAs
                            </a>
                            </h4>
                            <BootstrapTable keyField='sequence' data={badGrnas}
                            striped={true}
                            columns={BadGrnaJobResultsTableColumns}/>
                            </>
                            ) : null)}
        </>);

        break;
    case JobResultsState.ERROR:
        page = (
                <div className="alert alert-danger">
                Error loading results.
                </div>
               );
        break;
    default:
        page = (
                <div className="alert alert-warning">
                {"Job Results are currently pending..."}
                </div>
               );
        break;
    }

    return page;
}

export {JobResultsTable, GrnaJobResultsTable};
