import React from "react";
import "./App.css";
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faTrash } from '@fortawesome/free-solid-svg-icons'

const Menu = ({ setLineColor, mode, handleModeChange, shape, handleShapeChange, handleDelete }) => {

    // use native events instead of react events to only capture
    // color after color picker is closed to avoid getting a flood 
    // of color changes
    React.useEffect(() => {
        const colorPicker = document.getElementById('brushColor');
        const handler = (e) => {
            setLineColor(e.target.value);
        };
        colorPicker.addEventListener('change', handler);
        return () => {
            colorPicker.removeEventListener('change', handler);
        }
    });

    return (
        <div className="Menu">
            <label>Mode</label>
            <select value={mode} onChange={handleModeChange}>
                <option value="select">Select</option>
                <option value="create">Create</option>
                {/* <option value="Triangle">Triangle</option> */}
            </select>

            <label>Add shape</label>
            <select value={shape} onChange={handleShapeChange}>
                <option value="Rect">Rect</option>
                <option value="Circle">Circle</option>
                <option value="Text">Text</option>
                {/* <option value="Triangle">Triangle</option> */}
            </select>

            <label>Brush Color </label>
            <input id="brushColor" type="color" />

            <button style={{ border: '0px' }} onClick={handleDelete}>
                <FontAwesomeIcon icon={faTrash} />
            </button>
        </div>
    );
};

export default Menu;
