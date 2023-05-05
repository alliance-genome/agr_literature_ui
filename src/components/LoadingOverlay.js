import React from 'react';
import Spinner from "react-bootstrap/Spinner";


const LoadingOverlay = ({active}) => {
    return (
        <div className={"overlay" + (active ? " overlay-on" : "")}>
            <div style={{position: "absolute", top: "40%", left: "45%", color: "white"}}>
                <p style={{fontSize: "1.8em", paddingLeft: "0.8em"}}>
                    Loading ...
                </p>
                <Spinner variant="light" animation="border"/>
            </div>
        </div>
    )
}

export default LoadingOverlay;
