import React, { useRef, useEffect } from "react";
import { Text, Transformer } from "react-konva";

export default function ResizableText({
    x,
    y,
    text,
    isSelected,
    width,
    height,
    onResize,
    onDoubleClick,
    shapeProps,
}) {
    const textRef = useRef(null);
    const transformerRef = useRef(null);

    useEffect(() => {
        if (isSelected && transformerRef.current !== null) {
            transformerRef.current.nodes([textRef.current]);
            transformerRef.current.getLayer().batchDraw();
        }
    }, [isSelected]);

    function handleResize() {
        if (textRef.current !== null) {
            const textNode = textRef.current;
            const newWidth = textNode.width() * textNode.scaleX();
            const newHeight = textNode.height() * textNode.scaleY();
            textNode.setAttrs({
                width: newWidth,
                height: newHeight,
                scaleX: 1,
                scaleY: 1,
            });
            onResize(textNode.x(), textNode.y(), newWidth, newHeight, textNode.rotation());
        }
    }

    const transformer = isSelected ? (
        <Transformer
            ref={transformerRef}
            enabledAnchors={['top-left', 'top-center', 'top-right', 'middle-right', 'middle-left', 'bottom-left', 'bottom-center', 'bottom-right']}
            boundBoxFunc={(oldBox, newBox) => {
                newBox.width = Math.max(30, newBox.width);
                return newBox;
            }}
        />
    ) : null;

    return (
        <>
            <Text
                x={x}
                y={y}
                ref={textRef}
                text={text}
                fill="black"
                fontFamily="sans-serif"
                fontSize={24}
                perfectDrawEnabled={false}
                onTransformEnd={handleResize}
                onDblClick={onDoubleClick}
                onDblTap={onDoubleClick}
                width={width}
                height={height}
                {...shapeProps}
            />
            {transformer}
        </>
    );
}
