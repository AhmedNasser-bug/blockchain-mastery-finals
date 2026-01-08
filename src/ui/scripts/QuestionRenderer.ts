import { escapeHtml } from '../../utils';

export class QuestionRenderer {
    private container: HTMLElement;
    private qCounter: HTMLElement;
    private qCategory: HTMLElement;
    private qText: HTMLElement;
    private qOptions: HTMLElement;
    private qFeedback: HTMLElement;

    private optionTemplate: HTMLTemplateElement;
    private tfTemplate: HTMLTemplateElement;

    private LETTERS = ["A", "B", "C", "D", "E", "F"];

    constructor(containerId: string) {
        const el = document.getElementById(containerId);
        if (!el) throw new Error(`Question container #${containerId} not found`);
        this.container = el;

        this.qCounter = el.querySelector('.q-counter')!;
        this.qCategory = el.querySelector('.q-category')!;
        this.qText = el.querySelector('.q-text')!;
        this.qOptions = el.querySelector('.q-options')!;
        this.qFeedback = el.querySelector('.q-feedback')!;

        // Find templates scoped to this container
        this.optionTemplate = el.querySelector('.option-template') as HTMLTemplateElement;
        this.tfTemplate = el.querySelector('.tf-template') as HTMLTemplateElement;

        if (!this.optionTemplate || !this.tfTemplate) {
            console.error("Templates not found in container");
        }
    }

    render(q: any, currentIndex: number, total: number) {
        // 1. Text Content
        this.qCounter.textContent = `Question ${currentIndex + 1} of ${total}`;
        this.qCategory.textContent = q.category;

        // HTML vs Text
        if (q.isHtml) {
            this.qText.innerHTML = q.question;
        } else {
            this.qText.textContent = q.question;
        }

        // 2. Options
        this.qOptions.innerHTML = ''; // Clear previous
        this.qOptions.className = 'options-grid'; // Reset class

        this.qFeedback.innerHTML = '';
        this.qFeedback.className = 'feedback';


        if (q.type === 'tf') {
            this.renderTF();
        } else {
            // MCQ or Multi
            if (q.type === 'multi') {
                // Add instruction? Or just handle UI
            }
            this.renderOptions(q.options, q.type);
        }
    }

    private renderOptions(options: string[], type: string) {
        options.forEach((optText, idx) => {
            const clone = this.optionTemplate.content.cloneNode(true) as HTMLElement;
            const div = clone.querySelector('.option') as HTMLElement;
            const marker = div.querySelector('.marker')!;
            const text = div.querySelector('.text')!;
            const checkbox = div.querySelector('.checkbox-indicator') as HTMLElement;

            if (marker) marker.textContent = this.LETTERS[idx];
            if (text) text.textContent = optText; // Automatic escaping via textContent

            // Event Binding via global game proxy? Or direct?
            // Since we are creating elements, we can addEventListener directly! 
            // BUT legacy controllers expect window.game.*

            div.setAttribute('data-idx', idx.toString());

            if (type === 'multi') {
                div.classList.add('multi-option');
                checkbox.style.display = 'block';
                div.onclick = () => {
                    // @ts-ignore
                    if (window.game.selectMulti) window.game.selectMulti(idx);
                };
            } else {
                div.onclick = () => {
                    // @ts-ignore
                    if (window.game.selectMCQ) window.game.selectMCQ(idx);
                };
            }

            this.qOptions.appendChild(clone);
        });
    }

    private renderTF() {
        // TF Template contains the whole grid structure
        const clone = this.tfTemplate.content.cloneNode(true) as HTMLElement;
        const trueBtn = clone.querySelector('[data-value="true"]') as HTMLElement;
        const falseBtn = clone.querySelector('[data-value="false"]') as HTMLElement;

        if (trueBtn) trueBtn.onclick = () => {
            // @ts-ignore
            if (window.game.selectTF) window.game.selectTF(true);
        };

        if (falseBtn) falseBtn.onclick = () => {
            // @ts-ignore
            if (window.game.selectTF) window.game.selectTF(false);
        };

        this.qOptions.innerHTML = ''; // Ensure clear
        this.qOptions.appendChild(clone);

        // Remove grid class from parent if template handles it? 
        // The template has .tf-grid.
        // So we append .tf-grid to .options-grid. That's fine.
        this.qOptions.style.display = 'block'; // Override grid for container if needed, or let it flow
    }

    showFeedback(isCorrect: boolean, explanation: string, selectedValue?: any, correctValue?: any) {
        this.qFeedback.className = `feedback ${isCorrect ? 'correct' : 'incorrect'}`;
        this.qFeedback.innerHTML = `<strong>${isCorrect ? 'Correct.' : 'Incorrect.'}</strong> ${explanation}`;

        // Highlight Buttons
        if (selectedValue !== undefined && correctValue !== undefined) {
            // Handle TF
            if (typeof correctValue === 'boolean') {
                const selBool = selectedValue[0];
                const selBtn = this.qOptions.querySelector(`.tf-option[data-value="${selBool}"]`);
                if (selBtn) selBtn.classList.add(isCorrect ? 'correct' : 'incorrect');

                if (!isCorrect) {
                    const corrBtn = this.qOptions.querySelector(`.tf-option[data-value="${correctValue}"]`);
                    if (corrBtn) corrBtn.classList.add('correct');
                }
            }
            // Handle MCQ / Multi (Index based)
            else {
                const selIndices = Array.isArray(selectedValue) ? selectedValue : [selectedValue];
                const corrIndices = Array.isArray(correctValue) ? correctValue : [correctValue];

                // Mark User Selection
                selIndices.forEach((idx: number) => {
                    const btn = this.qOptions.querySelector(`.option[data-idx="${idx}"]`);
                    if (btn) btn.classList.add(isCorrect ? 'correct' : 'incorrect');
                });

                // If incorrect, show correct answer
                if (!isCorrect) {
                    corrIndices.forEach((idx: number) => {
                        const btn = this.qOptions.querySelector(`.option[data-idx="${idx}"]`);
                        if (btn) btn.classList.add('correct');
                    });
                }
            }
        }
    }
}
