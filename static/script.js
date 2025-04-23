async function debugRegex() {
    const patternInput = document.getElementById('pattern');
    const textInput = document.getElementById('text');
    const resultsListDiv = document.getElementById('resultsList');
    const highlightedTextOutputDiv = document.getElementById('highlightedTextOutput');
    const debugButton = document.getElementById('debugButton');
    const flagCheckboxes = document.querySelectorAll('.flag-checkbox');

    resultsListDiv.innerHTML = '';
    resultsListDiv.classList.remove('error');
    highlightedTextOutputDiv.innerHTML = '<p class="placeholder">Загрузите текст или введите его выше и нажмите "Отладить".</p>';
    highlightedTextOutputDiv.classList.remove('error');

    const pattern = patternInput.value;
    const text = textInput.value;

    const selectedFlags = Array.from(flagCheckboxes)
        .filter(checkbox => checkbox.checked)
        .map(checkbox => checkbox.value);

    if (!pattern || !text) {
        displayError('Пожалуйста, введите и регулярное выражение, и текст.', true);
        return;
    }

    debugButton.disabled = true;

    const requestData = {
        pattern: pattern,
        text: text,
        flags: selectedFlags
    };

    try {
        const response = await fetch('/debug/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(requestData)
        });

        if (response.ok) {
            const matches = await response.json();
            displayResults(matches, text);
        } else {
            const errorData = await response.json();
            displayError(errorData.detail || 'Произошла неизвестная ошибка', true);
        }
    } catch (error) {
        console.error('Ошибка при выполнении запроса:', error);
        displayError('Не удалось подключиться к серверу.', true);
    } finally {
        debugButton.disabled = false;
    }
}

document.getElementById('fileUpload').addEventListener('change', handleFileUpload);

function handleFileUpload(event) {
    const file = event.target.files[0];
    const textInput = document.getElementById('text');
    const fileNameDisplay = document.getElementById('fileNameDisplay');
    const highlightedTextOutputDiv = document.getElementById('highlightedTextOutput');

    if (file) {
        const reader = new FileReader();

        reader.onload = (e) => {
            textInput.value = e.target.result;
            fileNameDisplay.textContent = `Выбран файл: ${file.name}`;
            highlightedTextOutputDiv.innerHTML = '<p class="placeholder">Загрузите текст или введите его выше и нажмите "Отладить".</p>';
        };

        reader.onerror = (e) => {
            console.error('Ошибка при чтении файла:', e);
            fileNameDisplay.textContent = `Ошибка чтения файла: ${file.name}`;
            textInput.value = '';
            displayError('Не удалось прочитать файл.', true);
        };

        reader.readAsText(file);
        event.target.value = '';
    } else {
        textInput.value = '';
        fileNameDisplay.textContent = '';
        highlightedTextOutputDiv.innerHTML = '<p class="placeholder">Загрузите текст или введите его выше и нажмите "Отладить".</p>';
    }
}

function displayResults(matches, originalText) {
    const resultsListDiv = document.getElementById('resultsList');
    const highlightedTextOutputDiv = document.getElementById('highlightedTextOutput');

    highlightedTextOutputDiv.innerHTML = '';
    if (originalText) {
        let lastIndex = 0;
        const textWithHighlights = [];
        const sortedMatches = [...matches].sort((a, b) => a.start - b.start);

        sortedMatches.forEach(match => {
            if (match.start > lastIndex) {
                textWithHighlights.push(escapeHTML(originalText.substring(lastIndex, match.start)));
            }
            textWithHighlights.push(`<mark>${escapeHTML(match.match)}</mark>`);
            lastIndex = match.end;
        });

        if (lastIndex < originalText.length) {
            textWithHighlights.push(escapeHTML(originalText.substring(lastIndex)));
        }

        highlightedTextOutputDiv.innerHTML = textWithHighlights.join('');
    } else {
        highlightedTextOutputDiv.innerHTML = '<p class="placeholder">Текст для визуализации отсутствует.</p>';
    }

    const countParagraph = document.createElement('p');
    if (matches.length === 0) {
        countParagraph.innerHTML = '<strong>Найдено совпадений: 0</strong>';
        resultsListDiv.appendChild(countParagraph);
        return;
    }

    countParagraph.innerHTML = `<strong>Найдено совпадений: ${matches.length}</strong>`;
    resultsListDiv.appendChild(countParagraph);

    const ul = document.createElement('ul');

    matches.forEach(match => {
        const li = document.createElement('li');
        li.innerHTML = `
            <strong>Полное совпадение:</strong> <span class="match-text">${escapeHTML(match.match)}</span><br>
            <strong>Позиция:</strong> ${match.start}-${match.end}
        `;

        if (match.groups && match.groups.length > 0) {
            li.innerHTML += '<br><strong>Группы:</strong><ul>';
            match.groups.forEach((group, index) => {
                li.innerHTML += `<li>Группа ${index + 1}: <span class="group-text">${escapeHTML(group)}</span></li>`;
            });
            li.innerHTML += '</ul>';
        }

        ul.appendChild(li);
    });

    resultsListDiv.appendChild(ul);
}

function displayError(message, targetAlsoVisualization = false) {
    const resultsListDiv = document.getElementById('resultsList');
    const highlightedTextOutputDiv = document.getElementById('highlightedTextOutput');

    resultsListDiv.classList.add('error');
    resultsListDiv.innerHTML = `<p>Ошибка: ${escapeHTML(message)}</p>`;

    if (targetAlsoVisualization) {
        highlightedTextOutputDiv.classList.add('error');
        highlightedTextOutputDiv.innerHTML = `<p>Ошибка: ${escapeHTML(message)}</p>`;
    }
}

function escapeHTML(str) {
    if (typeof str !== 'string') {
        return '';
    }
    const div = document.createElement('div');
    div.appendChild(document.createTextNode(str));
    return div.innerHTML;
}