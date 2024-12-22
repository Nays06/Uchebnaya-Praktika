const keywordInput = document.getElementById('keyword');
const searchButton = document.getElementById('searchButton');
const urlListContainer = document.getElementById('urlListContainer');
const urlList = document.getElementById('urlList');
const downloadStatus = document.getElementById('downloadStatus');
const sizeSpan = document.getElementById('size');
const progressSpan = document.getElementById('progress');
const contentContainer = document.getElementById('contentContainer');
const contentDiv = document.getElementById('content');
const savedContentListContainer = document.getElementById('savedContentListContainer');
const savedContentList = document.getElementById('savedContentList');
const showSavedContentButton = document.getElementById('showSavedContentButton');
const errorContainer = document.getElementById('errorContainer');
const errorMessage = document.getElementById('errorMessage');

const serverUrl = 'http://localhost:3000';

const showError = (message) => {
    errorMessage.textContent = message;
    errorContainer.classList.remove('hidden');
};

const hideError = () => {
    errorContainer.classList.add('hidden');
};

const fetchKeywords = async () => {
    try {
        const response = await fetch(`${serverUrl}/keywords`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return await response.json();
    } catch (error) {
        showError(`Failed to fetch keywords: ${error.message}`);
    }
}

searchButton.addEventListener('click', async () => {
    hideError();
    const keyword = keywordInput.value;
    if (!keyword) {
        showError('Заполните поле ввода');
        return;
    }
    try {
        const response = await fetch(`${serverUrl}/urls?keyword=${keyword}`);
        if (!response.ok) {
            if (response.status === 404) {
                showError('Keyword not found');
            }
            else {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return
        }
        const urls = await response.json();
        displayUrls(urls);
    } catch (error) {
        showError(`Failed to fetch URLs: ${error.message}`);
    }
});

const displayUrls = (urls) => {
    urlList.innerHTML = '';
    urls.forEach(url => {
        const li = document.createElement('li');
        li.textContent = url;
        li.addEventListener('click', () => downloadContent(url));
        urlList.appendChild(li);
    });
    urlListContainer.classList.remove('hidden');
    contentContainer.classList.add('hidden');
};

const downloadFile = (content, filename) => {
    const blob = new Blob([content], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
};

const downloadContent = async (url) => {
    urlListContainer.classList.add('hidden');
    downloadStatus.classList.remove('hidden');
    sizeSpan.textContent = '...';
    progressSpan.textContent = '0';
    contentDiv.textContent = '';
  
    try {
        const response = await fetch(`${serverUrl}/download?url=${url}`);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const reader = response.body.getReader();
        let accumulatedText = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) {
                break;
            }
            const textChunk = new TextDecoder().decode(value);
            accumulatedText += textChunk;

            let lastIndex = 0;
            let currentIndex;
            while ((currentIndex = accumulatedText.indexOf('\n', lastIndex)) !== -1) {
                const line = accumulatedText.substring(lastIndex, currentIndex);
                lastIndex = currentIndex + 1;
                if (line.trim() !== '') {
                    try {
                        const data = JSON.parse(line);
                        if (data.status === 'progress') {
                            sizeSpan.textContent = data.size ? data.size : 'Unknown';
                            progressSpan.textContent = data.progress;
                        } else if (data.status === 'completed') {
                            saveContent(url, 1); // Сохраняем в LocalStorage
                            downloadFile(data.content, `downloaded-${Date.now()}.html`)
                            downloadStatus.classList.add('hidden'); // Скрываем статус после скачивания
                        }
                    } catch (e) {
                        console.error('Error parsing JSON chunk', e);
                    }
                }
            }
            accumulatedText = accumulatedText.substring(lastIndex);
        }
    } catch (error) {
        showError(`Failed to download content: ${error.message}`);
        downloadStatus.classList.add('hidden');
    }
};

const saveContent = (url, content) => {
    localStorage.setItem(url, content);
}

const loadSavedContent = () => {
    savedContentList.innerHTML = '';
    for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        const value = localStorage.getItem(key);
        const li = document.createElement('li');
        li.textContent = key;
        li.style.userSelect = 'none'
        savedContentList.appendChild(li);
    }

    if (localStorage.length > 0) {
        savedContentListContainer.classList.remove('hidden');
    }
    else {
        savedContentListContainer.classList.add('hidden');
    }

}

const displaySavedContent = (content) => {
    contentDiv.innerHTML = content; //Заменяем textContent на innerHTML
    contentContainer.classList.remove('hidden');
    savedContentListContainer.classList.add('hidden');
}

showSavedContentButton.addEventListener('click', () => {
    hideError();
    loadSavedContent();
});

document.addEventListener('DOMContentLoaded', async () => {
    await fetchKeywords()
})