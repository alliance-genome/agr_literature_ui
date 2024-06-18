import React from 'react';
import Button from "react-bootstrap/Button";
import { RiCloseFill } from "react-icons/ri";

const BreadcrumbItem = ({ label, onRemove }) => {
    return (
        <span>
            <Button variant="outline-secondary">
                {label} &nbsp;
                <RiCloseFill onClick={onRemove} />
            </Button>&nbsp;&nbsp;
        </span>
    );
};

export default BreadcrumbItem;
