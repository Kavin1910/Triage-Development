// Utility Functions
function toggleLoading(show, elementId = 'statusMessage') {
    const statusMessage = document.getElementById(elementId);
    
    if (show) {
        statusMessage.innerHTML = `
            <div class="spinner"></div>
        `;
    } else {
        statusMessage.innerHTML = '';
    }
}

function showStatusMessage(message, type = 'info', elementId = 'statusMessage') {
    const statusDiv = document.getElementById(elementId);
    statusDiv.innerHTML = `
        <div class="status-message status-${type}">
            ${message}
        </div>
    `;
}

function getSeverityInfo(rating) {
    if (rating >= 9) return { class: 'severity-critical', label: 'Critical' };
    if (rating >= 7) return { class: 'severity-urgent', label: 'Urgent' };
    if (rating >= 4) return { class: 'severity-moderate', label: 'Moderate' };
    return { class: 'severity-low', label: 'Low' };
}

function truncateText(text, maxLength = 100) {
    if (!text) return 'No details available';
    if (text.length <= maxLength) return text;
    return text.substr(0, maxLength) + '...';
}

function formatDateTime(date) {
    return new Date(date).toLocaleString();
}

// Improved result card creation for consistency
function createResultCard(result, isHistory = false) {
    const severityInfo = getSeverityInfo(result.severity_rating || 0);
    const truncatedComment = truncateText(result.comment, 150);
    
    return `
        <div class="result-card" data-image-name="${result.image_name || ''}">
            <img src="data:image/jpeg;base64,${result.image_data}" class="result-image" alt="MRI Scan">
            <div class="result-details">
                <div>
                    <span class="severity-badge ${severityInfo.class}">
                        ${severityInfo.label}
                    </span>
                    <h3>${result.image_name || 'MRI Scan'}</h3>
                    <p><strong>Severity Rating:</strong> ${(result.severity_rating || 0).toFixed(1)}/10</p>
                    <p><strong>Processed:</strong> ${formatDateTime(result.processed_at)}</p>
                    <p class="truncate-text" data-full-text="${result.comment || ''}">
                        ${truncatedComment}
                        ${result.comment && result.comment.length > 150 
                            ? '<span class="more-link">More</span>' 
                            : ''}
                    </p>
                    <div class="more-details-toggle">ⓘ More Details</div>
                    <div class="more-details">
                        <p><strong>Detailed Comment:</strong> ${result.comment || 'No additional details'}</p>
                        ${result.radiologist_notes 
                            ? `<p><strong>Radiologist Notes:</strong> ${result.radiologist_notes}</p>` 
                            : ''}
                    </div>
                </div>
                ${!isHistory 
                    ? `<div class="notes-section">
                        <textarea placeholder="Add radiologist notes..." class="radiologist-notes"></textarea>
                        <button class="save-notes-btn">Save Notes</button>
                       </div>`
                    : ''}
            </div>
        </div>
    `;
}

// Fetch history function - moved outside event listeners to make it globally accessible
function fetchHistory() {
    fetch('/view-history')
        .then(response => response.json())
        .then(data => {
            const historyResults = document.getElementById('historyResults');
            historyResults.innerHTML = '';
            data.forEach(result => {
                historyResults.innerHTML += createResultCard(result, true);
            });
        })
        .catch(error => {
            console.error('Error fetching history:', error);
            showStatusMessage('Failed to fetch history.', 'info', 'historyResults');
        });
}

// Tab Switching
document.querySelectorAll('.tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(tc => tc.classList.remove('active'));
        
        tab.classList.add('active');
        document.getElementById(`${tab.dataset.tab}-content`).classList.add('active');

        if (tab.dataset.tab === 'history') {
            fetchHistory();
        }
    });
});

// File upload handling
document.getElementById('fileInput').addEventListener('change', function(e) {
    const fileList = document.getElementById('fileList');
    fileList.innerHTML = '';
    
    Array.from(this.files).forEach(file => {
        const fileItem = document.createElement('div');
        fileItem.textContent = file.name;
        fileList.appendChild(fileItem);
    });
});

document.getElementById('uploadBtn').addEventListener('click', () => {
    const fileInput = document.getElementById('fileInput');
    const uploadStatusMessage = document.getElementById('uploadStatusMessage');
    const uploadResults = document.getElementById('uploadResults');

    if (fileInput.files.length === 0) {
        uploadStatusMessage.innerHTML = '<div class="status-message status-info">Please select at least one image</div>';
        return;
    }

    const formData = new FormData();
    for (let file of fileInput.files) {
        formData.append('file', file);
    }

    toggleLoading(true, 'uploadStatusMessage');
    fetch('/upload-image', {
        method: 'POST',
        body: formData
    })
        .then(response => response.json())
        .then(data => {
            toggleLoading(false, 'uploadStatusMessage');
            uploadResults.innerHTML = '';
            
            if (data.results) {
                data.results.forEach(result => {
                    uploadResults.innerHTML += createResultCard(result);
                });
                uploadStatusMessage.innerHTML = `<div class="status-message status-success">Successfully uploaded and analyzed ${data.results.length} image(s)</div>`;
            } else if (data.error) {
                uploadStatusMessage.innerHTML = `<div class="status-message status-info">${data.error}</div>`;
            }
        })
        .catch(error => {
            toggleLoading(false, 'uploadStatusMessage');
            uploadStatusMessage.innerHTML = '<div class="status-message status-info">Upload failed. Please try again.</div>';
            console.error('Error:', error);
        });
});

// Clear file selection
document.getElementById('clearFilesBtn').addEventListener('click', () => {
    document.getElementById('fileInput').value = '';
    document.getElementById('fileList').innerHTML = 'No files selected';
    document.getElementById('uploadResults').innerHTML = '';
    document.getElementById('uploadStatusMessage').innerHTML = '';
});

// Fetch Images
let fetchedResults = [];
document.getElementById('fetchImagesBtn').addEventListener('click', () => {
    toggleLoading(true);
    fetch('/fetch-images', { method: 'POST' })
        .then(response => response.json())
        .then(data => {
            toggleLoading(false);
            const resultsContainer = document.getElementById('results');
            
            if (data.processed_count === 0) {
                showStatusMessage('No new images found for analysis.', 'info');
            } else {
                fetchedResults = [...fetchedResults, ...data.results];
                resultsContainer.innerHTML = fetchedResults.map(result => createResultCard(result)).join('');
                showStatusMessage(`Successfully fetched ${data.processed_count} new MRI images.`, 'success');
            }
        })
        .catch(error => {
            toggleLoading(false);
            showStatusMessage('Failed to fetch images. Please try again.', 'info');
            console.error('Error:', error);
        });
});

// Event delegation for various interactions
document.addEventListener('click', (e) => {
    // More details toggle
    if (e.target.classList.contains('more-details-toggle')) {
        const resultCard = e.target.closest('.result-card');
        resultCard.classList.toggle('expanded');
    }

    // More details popup
    if (e.target.classList.contains('more-link')) {
        const fullText = e.target.closest('.truncate-text').dataset.fullText;
        alert(fullText);
    }

    // Save notes
    if (e.target.classList.contains('save-notes-btn')) {
        const resultCard = e.target.closest('.result-card');
        const notesTextarea = resultCard.querySelector('.radiologist-notes');
        const radiologistNotes = notesTextarea.value.trim();
        const imageName = resultCard.dataset.imageName;

        const severityRating = parseFloat(resultCard.querySelector('.result-details p:nth-of-type(1)').textContent.split(':')[1].trim());
        const comment = resultCard.querySelector('.truncate-text').dataset.fullText;
        const imageData = resultCard.querySelector('.result-image').src.split(',')[1];
        const processedAt = resultCard.querySelector('.result-details p:nth-of-type(2)').textContent.split(': ')[1];

        fetch('/save-image-notes', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                image_name: imageName,
                radiologist_notes: radiologistNotes,
                severity_rating: severityRating,
                comment: comment,
                image_data: imageData,
                processed_at: processedAt
            })
        })
            .then(response => response.json())
            .then(data => {
                if (data.message) {
                    alert('Notes saved successfully');
                    const historyResults = document.getElementById('historyResults');
                    historyResults.innerHTML += createResultCard({
                        image_name: imageName,
                        radiologist_notes: radiologistNotes,
                        severity_rating: severityRating,
                        comment: comment,
                        image_data: imageData,
                        processed_at: processedAt
                    }, true);
                    fetchedResults = fetchedResults.filter(r => r.image_name !== imageName);
                    const resultsContainer = document.getElementById('results');
                    resultsContainer.innerHTML = fetchedResults.map(result => createResultCard(result)).join('');
                    resultCard.remove();
                } else {
                    alert('Failed to save notes');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                alert('Failed to save notes');
            });
    }
});