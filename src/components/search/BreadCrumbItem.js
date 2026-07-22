import React from 'react';
import Button from "react-bootstrap/Button";
import { OverlayTrigger, Tooltip } from "react-bootstrap";
import { RiCloseFill } from "react-icons/ri";

const BreadcrumbItem = ({ label, onRemove, tooltip, variant = "outline-secondary" }) => {
    const chip = (
        <span>
            <Button variant={variant}>
                {label} &nbsp;
                <RiCloseFill onClick={onRemove} />
            </Button>&nbsp;&nbsp;
        </span>
    );
    // When a tooltip is supplied, wrap the chip so hovering it shows the detail
    // (e.g. the advanced query preview). whiteSpace:pre-line keeps multi-line text.
    if (tooltip) {
        return (
            <OverlayTrigger
                placement="bottom"
                overlay={
                    <Tooltip id="breadcrumb-tooltip" style={{ whiteSpace: 'pre-line' }}>
                        {tooltip}
                    </Tooltip>
                }
            >
                {chip}
            </OverlayTrigger>
        );
    }
    return chip;
};

export default BreadcrumbItem;
