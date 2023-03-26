import React from 'react';
import { useState, useEffect, useRef } from 'react';
import { Stage, Layer, Circle, Rect, Text } from 'react-konva';
import * as Automerge from '@automerge/automerge';
import { v4 as uuid } from "uuid";
import Menu from './Menu';
import Rectangle from './Rectangle';
import CircleT from './Circle';
import CustomText from './CustomText';

const shapeTemplate = {
    type: Rect || Circle,
    id: '0',
    x: Math.random() * window.innerWidth,
    y: Math.random() * window.innerHeight,
    width: 40,
    height: 40,
    rotation: 0,
    isDragging: false,
    fill: "#89b717",
    isSelected: false,
    text: 'double click to change text..',
    isEditing: false,
};

function generateShapes() {
    return [...Array(2)].map((_, i) => ({
        ...shapeTemplate,
        type: Rect,
        id: uuid(),
        x: 100 * (i + 1),
        y: 200 * (i + 1),
        rotation: 45 * i,
        fill: i % 2 === 0 ? 'red' : 'blue',
    }));
}

const INITIAL_STATE = generateShapes();

let stateDoc = Automerge.from({ shapes: INITIAL_STATE });

const Canvas = ({ messages, sendMsg }) => {
    const [shapes, setShapes] = useState(INITIAL_STATE);
    const [mode, setMode] = useState('select');
    const [selectedShape, setSelectedShape] = useState(null);
    const [createShape, setCreateShape] = useState(Rect);
    const selectedColor = useRef('black');

    const handleShapeChange = (event) => {
        if (event.target.value == 'Rect') {
            setCreateShape(Rect);
        }
        else if (event.target.value == 'Circle') {
            setCreateShape(Circle);
        }
        else if (event.target.value == 'Text') {
            setCreateShape(Text);
        }
    };
    const handleDragStart = (e) => {
        const id = e.target.id();
        stateDoc = Automerge.change(stateDoc, "start drag", doc => {
            doc.shapes.map(shape => {
                shape.isSelected = shape.id === id;
                shape.isDragging = shape.id === id;
            })
        });
        setShapes(stateDoc.shapes);
        setSelectedShape(e.target.id());
        let binary = Automerge.save(stateDoc);
        sendMsg(binary);
    };
    const handleDragEnd = (e) => {
        const id = e.target.id();
        stateDoc = Automerge.change(stateDoc, "end drag", doc => {
            doc.shapes.map(shape => {
                shape.isDragging = false;
                if (shape.id == id) {
                    shape.x = e.target.x();
                    shape.y = e.target.y();
                }
            })
        });
        setShapes(stateDoc.shapes);
        let binary = Automerge.save(stateDoc);
        sendMsg(binary);
    };
    const setLineColor = (color) => {
        selectedColor.current = color;
        if (selectedShape) {
            stateDoc = Automerge.change(stateDoc, "change color", doc => {
                doc.shapes.map(shape => {
                    if (shape.id == selectedShape) {
                        shape.fill = color;
                    }
                })
            });
            setShapes(stateDoc.shapes);
            let binary = Automerge.save(stateDoc);
            sendMsg(binary);
        }
    };
    const selectShape = (e) => {
        // console.log(e.target.id());
        stateDoc = Automerge.change(stateDoc, "select shape", doc => {
            doc.shapes.map(shape => shape.isSelected = shape.id === e.target.id())
        });
        setShapes(stateDoc.shapes);
        setSelectedShape(e.target.id());
        let binary = Automerge.save(stateDoc);
        sendMsg(binary);
    };
    const createNewShapes = (e) => {
        // if clicked on canvas in select mode, we unselect shapes if none is pressed
        if (mode == 'select') {
            const clickedOnEmpty = e.target === e.target.getStage();
            if (clickedOnEmpty) {
                stateDoc = Automerge.change(stateDoc, "select shape", doc => {
                    doc.shapes.map(shape => shape.isSelected = false)
                });
                setShapes(stateDoc.shapes);
                setSelectedShape(null);
                let binary = Automerge.save(stateDoc);
                sendMsg(binary);
            }
        }
        // only add new objects if in create mode
        else if (mode == 'create') {
            let id = uuid();
            stateDoc = Automerge.change(stateDoc, "create shape", doc => {
                doc.shapes.map(shape => shape.isSelected = false);
                doc.shapes.push({
                    ...shapeTemplate,
                    id,
                    x: e.evt.offsetX,
                    y: e.evt.offsetY,
                    type: createShape,
                    isSelected: true,
                    fill: selectedColor.current,
                    width: createShape === Text ? 200 : 40,
                    height: createShape === Text ? 60 : 40,
                });
            });
            setShapes(stateDoc.shapes);
            setSelectedShape(id);
            let binary = Automerge.save(stateDoc);
            sendMsg(binary);
        }
    };
    const handleUndo = () => {
        // console.log(Automerge.getHistory(stateDoc).length);
        // console.log(Automerge.getHistory(stateDoc));
        // console.log(Automerge.getHistory(stateDoc).pop().change);
        // console.log(Automerge.getHeads(stateDoc));
        // let older = Automerge.getHistory(stateDoc)[2].snapshot.shapes;
        // // stateDoc = Automerge.change(stateDoc, "undo", doc => {
        // //     doc.shapes = older;
        // // });
        // setShapes(older);
    };
    const handleTransformEnd = ({ id, x, y, width, height, rotation }) => {
        stateDoc = Automerge.change(stateDoc, "transform end", doc => {
            doc.shapes.map(shape => {
                if (shape.id == id) {
                    shape.x = x;
                    shape.y = y;
                    shape.width = width;
                    shape.height = height;
                    shape.rotation = rotation;
                }
            })
        });
        setShapes(stateDoc.shapes);
        let binary = Automerge.save(stateDoc);
        sendMsg(binary);
    };
    const handleDelete = () => {
        if (selectedShape) {
            stateDoc = Automerge.change(stateDoc, "delete", doc => {
                for (let i = 0; i < doc.shapes.length; i++) {
                    if (doc.shapes[i].id == selectedShape) {
                        doc.shapes.deleteAt(i);
                        break;
                    }
                }
            });
            setShapes(stateDoc.shapes);
            let binary = Automerge.save(stateDoc);
            sendMsg(binary);
        }
    };
    const updateText = (id, props) => {
        stateDoc = Automerge.change(stateDoc, "update text", doc => {
            doc.shapes.map(shape => {
                if (shape.id == id) {
                    shape.x = props.x || shape.x;
                    shape.y = props.y || shape.y;
                    shape.width = props.width || shape.width;
                    shape.height = props.height || shape.height;
                    shape.text = props.text || shape.text;
                    shape.rotation = props.rotation || shape.rotation;
                    if ([true, false].includes(props.isEditing)) {
                        shape.isEditing = props.isEditing;
                    }
                }
            })
        });
        setShapes(stateDoc.shapes);
        let binary = Automerge.save(stateDoc);
        sendMsg(binary);
    };

    useEffect(() => {
        let data = new Uint8Array(messages);
        const isEqual = Automerge.equals(Automerge.load(data), stateDoc);
        if (!isEqual) {
            console.log('received new document, applying..');
            stateDoc = Automerge.merge(stateDoc, Automerge.load(data));
            setShapes(stateDoc.shapes);
            let binary = Automerge.save(stateDoc);
            sendMsg(binary);
        } else {
            console.log('received the same document, skipping..');
        }
    }, [messages]);

    return (
        <div style={{ border: '1px solid black' }}>
            <Menu
                setLineColor={setLineColor}
                mode={mode}
                handleModeChange={(event) => {
                    setMode(event.target.value);
                }}
                shape={createShape}
                handleShapeChange={handleShapeChange}
                handleDelete={handleDelete}
            ></Menu>

            <Stage width={window.innerWidth - 45} height="500"
                onClick={createNewShapes}
            >
                <Layer>
                    {/* <Text text="undo" onClick={handleUndo} />
                    <Text text="redo" x={40} onClick={() => { }} /> */}
                    {shapes.map((shape) => {
                        const propsObj = {
                            key: shape.id,
                            id: shape.id,
                            x: shape.x,
                            y: shape.y,
                            width: shape.width,
                            height: shape.height,
                            text: shape.text,
                            isEditing: shape.isEditing,
                            fill: shape.fill,
                            opacity: 0.8,
                            draggable: true,
                            rotation: shape.rotation,
                            shadowColor: "black",
                            shadowBlur: 10,
                            shadowOpacity: 0.6,
                            shadowOffsetX: shape.isDragging ? 10 : 5,
                            shadowOffsetY: shape.isDragging ? 10 : 5,
                            scaleX: shape.isDragging ? 1.2 : 1,
                            scaleY: shape.isDragging ? 1.2 : 1,
                            onDragStart: handleDragStart,
                            onDragEnd: handleDragEnd,
                            onClick: selectShape,
                            onTap: selectShape,
                        };
                        if (shape.type == Rect) {
                            return <Rectangle
                                shapeProps={propsObj}
                                isSelected={shape.isSelected}
                                handleTransformEnd={handleTransformEnd}
                            ></Rectangle>
                        }
                        if (shape.type == Circle) {
                            return <CircleT
                                shapeProps={propsObj}
                                isSelected={shape.isSelected}
                                handleTransformEnd={handleTransformEnd}
                            ></CircleT>
                        }
                        if (shape.type == Text) {
                            return <CustomText
                                shapeProps={propsObj}
                                isSelected={shape.isSelected}
                                updateText={updateText}
                            ></CustomText>

                        }
                    })}
                </Layer>
            </Stage>
        </div>
    );
};

export default Canvas;
