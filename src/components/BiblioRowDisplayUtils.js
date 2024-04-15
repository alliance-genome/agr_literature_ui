import React from 'react';
import Row from 'react-bootstrap/Row';
import Col from 'react-bootstrap/Col';

export const RowDisplayResourcesForCuration = ({referenceJsonLive}) => {
    if ('resources_for_curation' in referenceJsonLive && referenceJsonLive['resources_for_curation'] !== null) {
        let resource_list = "";
        referenceJsonLive['resources_for_curation'].forEach(resource => {
            if (resource_list !== '') {
                resource_list += " | ";
            }
            resource_list += `<a href="${resource.link_url}" target="_blank">${resource.display_name}</a>`;
        });
        return (
            <Row key='resources_for_curation' className="Row-general" xs={2} md={4} lg={6}>
                <Col className='Col-general Col-display Col-display-left'>Resources for Curation</Col>
                <Col className='Col-general Col-display Col-display-right' lg={{ span: 10 }}>
                    <div dangerouslySetInnerHTML={{ __html: resource_list }}></div>
                </Col>
            </Row>
        );
    } else {
        return null;
    }
}
