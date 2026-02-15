import React, { useRef, useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import jsmediatags from 'jsmediatags/dist/jsmediatags.min.js';

const MusicPlayer = ({ currentSong, onUpload, onStartStream, onStopStream, songHistory }) => {
    const [selectedFile, setSelectedFile] = useState(null);
    const audioRef = useRef(null);
    const [isPlaying, setIsPlaying] = useState(false);

    useEffect(() => {
        if (currentSong && audioRef.current) {
            // If a new song starts streaming, load and play it
            audioRef.current.src = currentSong.songPath;
            audioRef.current.load();

            const playPromise = audioRef.current.play();
            if (playPromise !== undefined) {
                playPromise.then(() => {
                    setIsPlaying(true);
                }).catch(e => {
                    console.error("Auto-play prevented:", e);
                    setIsPlaying(false);
                    toast.error("Click play to start audio (Autoplay blocked)");
                });
            }
        } else if (!currentSong && audioRef.current) {
            // Stop streaming
            audioRef.current.pause();
            audioRef.current.src = "";
            setIsPlaying(false);
        }
    }, [currentSong]);

    const handleFileChange = (e) => {
        setSelectedFile(e.target.files[0]);
    };

    const extractCoverArt = (file) => {
        return new Promise((resolve) => {
            jsmediatags.read(file, {
                onSuccess: (tag) => {
                    const { picture } = tag.tags;
                    if (picture) {
                        const { data, format } = picture;
                        let base64String = "";
                        for (let i = 0; i < data.length; i++) {
                            base64String += String.fromCharCode(data[i]);
                        }
                        const base64 = `data:${format};base64,${window.btoa(base64String)}`;

                        // Convert base64 to File object for upload
                        fetch(base64)
                            .then(res => res.blob())
                            .then(blob => {
                                const file = new File([blob], "cover_art.jpg", { type: format });
                                resolve({ base64, file });
                            });
                    } else {
                        resolve(null);
                    }
                },
                onError: (error) => {
                    console.log('Error reading tags:', error);
                    resolve(null);
                }
            });
        });
    };

    const handleUpload = async () => {
        if (selectedFile) {
            const toastId = toast.loading("Processing file...");
            try {
                const coverArtData = await extractCoverArt(selectedFile);
                toast.dismiss(toastId);
                onUpload(selectedFile, coverArtData?.file);
                setSelectedFile(null); // Clear selection after upload
            } catch (err) {
                toast.dismiss(toastId);
                console.error("Error processing file:", err);
                // Upload anyway without cover?
                onUpload(selectedFile, null);
                setSelectedFile(null);
            }
        } else {
            toast.error("Please select a file first.");
        }
    };

    const togglePlay = () => {
        if (audioRef.current) {
            if (audioRef.current.paused) {
                audioRef.current.play().then(() => setIsPlaying(true)).catch(e => console.error("Play error:", e));
            } else {
                audioRef.current.pause();
                setIsPlaying(false);
            }
        }
    };

    // Sync state with actual audio events
    const onPlay = () => setIsPlaying(true);
    const onPause = () => setIsPlaying(false);

    const skipTime = (seconds) => {
        if (audioRef.current) {
            audioRef.current.currentTime += seconds;
        }
    };

    return (
        <div className="musicPlayerWrapper">
            <h3>Music Player</h3>

            <div className="playerControls">
                <div className="currentSongDisplay">
                    {currentSong ? (
                        <>
                            <img
                                src={currentSong.coverImage || "/default-music-icon.png"}
                                alt="Cover"
                                className="songThumbnail"
                                onError={(e) => { e.target.onerror = null; e.target.src = "https://placehold.co/50x50/333/FFF?text=Music" }}
                            />
                            <div className="songDetails">
                                <span className="nowPlayingLabel">Now Playing:</span>
                                <span className="songTitle" title={currentSong.songName}>{currentSong.songName || "Unknown Track"}</span>
                            </div>
                        </>
                    ) : (
                        <>
                            <div className="songThumbnail" style={{ background: '#333' }}></div>
                            <div className="songDetails">
                                <span className="idleLabel">No song playing</span>
                            </div>
                        </>
                    )}
                </div>

                {/* Hidden Audio Element - controlled by custom buttons */}
                <audio
                    ref={audioRef}
                    onEnded={() => setIsPlaying(false)}
                    onPause={onPause}
                    onPlay={onPlay}
                    style={{ display: 'none' }}
                    crossOrigin="anonymous"
                />

                <div className="controlButtons">
                    <button className="btn controlBtn" onClick={() => skipTime(-10)} disabled={!currentSong}>-10s</button>
                    <button className="btn playBtn" onClick={togglePlay} disabled={!currentSong}>
                        {isPlaying ? "Pause" : "Play"}
                    </button>
                    <button className="btn controlBtn" onClick={() => skipTime(10)} disabled={!currentSong}>+10s</button>
                </div>

                {currentSong && (
                    <button className="btn stopBtn" onClick={onStopStream}>Stop Stream</button>
                )}
            </div>

            <div className="uploadSection">
                <input
                    type="file"
                    accept="audio/*"
                    onChange={handleFileChange}
                    id="fileInput"
                    className="fileInput"
                />
                <label htmlFor="fileInput" className="fileLabel">
                    {selectedFile ? selectedFile.name : "Choose File"}
                </label>
                <button className="btn uploadBtn" onClick={handleUpload}>Upload Song</button>
            </div>

            <div className="songHistory">
                <h4>Song History</h4>
                {songHistory.length === 0 ? (
                    <p className="noHistory">No songs added yet.</p>
                ) : (
                    <ul className="historyList">
                        {songHistory.map((song, index) => (
                            <li key={index} className="historyItem" onClick={() => onStartStream(song)}>
                                <div style={{ display: 'flex', alignItems: 'center' }}>
                                    <img
                                        src={song.coverImage || "https://placehold.co/40x40/333/FFF?text=Music"}
                                        alt="art"
                                        style={{ width: '40px', height: '40px', borderRadius: '4px', marginRight: '10px', objectFit: 'cover' }}
                                    />
                                    <div style={{ overflow: 'hidden' }}>
                                        <span className="historySongName">{song.songName}</span>
                                        <span className="historyUser">by {song.addedBy}</span>
                                    </div>
                                </div>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
};

export default MusicPlayer;
