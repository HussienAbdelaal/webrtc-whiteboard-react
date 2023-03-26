import React from 'react';
import { useRef } from 'react';
import ResizableText from './RichText/ResizableText.js';
import EditableTextInput from './RichText/EditableTextInput';

const RETURN_KEY = 13;
const ESCAPE_KEY = 27;

const CustomText = ({ shapeProps, isSelected, updateText }) => {
    const id = useRef(shapeProps.id);

    return (
        <>
            {(shapeProps.isEditing && (
                <EditableTextInput
                    x={shapeProps.x}
                    y={shapeProps.y}
                    width={shapeProps.width}
                    height={shapeProps.height}
                    value={shapeProps.text}
                    onChange={(e) => {
                        updateText(id.current, { text: e.currentTarget.value });
                    }}
                    onKeyDown={(e) => {
                        if ((e.keyCode === RETURN_KEY && !e.shiftKey) || e.keyCode === ESCAPE_KEY) {
                            updateText(id.current, { isEditing: false });
                        }
                    }}
                />
            )) || (
                    <ResizableText
                        shapeProps={shapeProps}
                        x={shapeProps.x}
                        y={shapeProps.y}
                        isSelected={isSelected}
                        onDoubleClick={(e) => {
                            updateText(id.current, { isEditing: true });
                        }}
                        onResize={(x, y, width, height, rotation) => {
                            updateText(id.current, { x, y, width, height, rotation });
                        }}
                        text={shapeProps.text}
                        width={shapeProps.width}
                        height={shapeProps.height}
                    />
                )}
        </>
    );
};

export default CustomText;
