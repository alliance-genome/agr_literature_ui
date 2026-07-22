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
    // (e.g. the advanced query preview). A custom class gives it a wider, lighter
    // box (Bootstrap's default is narrow and dark); shown above the chip.
    if (tooltip) {
        return (
            <OverlayTrigger
                placement="top"
                overlay={
                    <Tooltip id="breadcrumb-tooltip" className="breadcrumb-wide-tooltip">
                        <div style={{ whiteSpace: 'pre-line', textAlign: 'left' }}>
                            {tooltip}
                        </div>
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
