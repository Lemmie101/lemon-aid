import React, {useCallback, useEffect, useRef, useState} from 'react';
import * as tf from '@tensorflow/tfjs-core';
import {Human} from '@vladmandic/human';

// Configuration for the Human library.
const humanConfig = {
    modelBasePath: 'https://cdn.jsdelivr.net/npm/@vladmandic/human/models/',
    face: {enabled: true},
    body: {enabled: false},
    hand: {enabled: false},
    object: {enabled: false},
};

// Create an instance of the Human library with the specified configuration.
const human = new Human(humanConfig);

// HumanComponent uses the Human library to detect faces in a video stream.
function HumanComponent() {
    // References to the video and canvas HTML elements.
    const videoRef = useRef(null);
    const canvasRef = useRef(null);
    // State to track the readiness of the Human model for detection.
    const [modelReady, setModelReady] = useState(false);

    // Function to start the detection loop.
    const detect = useCallback(async () => {
        // Continue the loop only if the video and canvas refs are set and the model is ready.
        if (videoRef.current && canvasRef.current && modelReady) {
            try {
                // Perform face detection on the video element.
                const result = await human.detect(videoRef.current);
                const interpolated = human.next(result);

                // Draw the video and the detected faces on the canvas.
                human.draw.canvas(videoRef.current, canvasRef.current);
                await human.draw.all(canvasRef.current, interpolated);
            } catch (error) {
                console.error('Detection failed:', error);
            }
        }
        // Request the next animation frame to continue the loop.
        requestAnimationFrame(detect);
    }, [modelReady]);

    // Function to load the model and start the video stream.
    async function loadAndStart() {
        await tf.ready(); // Ensure TensorFlow.js is ready.
        await human.load(); // Load the Human model.
        setModelReady(true);

        // Start video stream from the user's camera.
        const videoElement = videoRef.current;
        if (videoElement) {
            try {
                videoElement.srcObject = await navigator.mediaDevices.getUserMedia({video: true});
                await videoElement.play();
            } catch (error) {
                console.error('Error starting video stream:', error);
            }
        }
    }

    useEffect(() => {
        const videoElement = videoRef.current;

        // When video metadata is ready, set the canvas size and start the detection loop.
        const handleLoadedMetadata = () => {
            canvasRef.current.width = videoElement.videoWidth;
            canvasRef.current.height = videoElement.videoHeight;
            // noinspection JSIgnoredPromiseFromCall
            detect(); // Start the detection loop.
        };

        if (videoElement) {
            videoElement.addEventListener('loadedmetadata', handleLoadedMetadata);
        }

        // Start loading the model and the video stream.
        // noinspection JSIgnoredPromiseFromCall
        loadAndStart();

        // Cleanup function to stop the video stream when the component unmounts.
        return () => {
            if (videoElement && videoElement.srcObject) {
                const tracks = videoElement.srcObject.getTracks();
                tracks.forEach(track => track.stop());
                videoElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
            }
        };
    }, [modelReady, detect]); // Re-run the effect if 'modelReady' state changes.

    // Render the video and canvas elements.
    return (
        <div>
            <h1>Webcam Stream with Human Detection</h1>
            <video ref={videoRef} autoPlay muted playsInline/>
            <canvas ref={canvasRef}/>
        </div>
    );
}

export default HumanComponent;