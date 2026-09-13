document.addEventListener("DOMContentLoaded", () => {
    // ================================
    // ELEMENTS
    // ================================

    const promptInput = document.getElementById("prompt");
    const charCount = document.getElementById("charCount");

    const enhanceBtn = document.getElementById("enhanceBtn");
    const generateBtn = document.getElementById("generateBtn");

    const loadingState = document.getElementById("loadingState");
    const loadingText = document.getElementById("loadingText");

    const generatedResult = document.getElementById("generatedResult");
    const generatedImage = document.getElementById("generatedImage");
    const resultPrompt = document.getElementById("resultPrompt");

    const downloadBtn = document.getElementById("downloadBtn");

    const galleryGrid = document.getElementById("galleryGrid");
    const emptyState = document.getElementById("emptyState");

    // ================================
    // THEME
    // ================================

    const themeButton = document.querySelector(".nav-icon");

    const savedTheme = localStorage.getItem("dreamforge-theme");

    if (savedTheme === "light") {
        document.body.classList.add("light-mode");
    }

    if (themeButton) {
        themeButton.addEventListener("click", () => {
            document.body.classList.toggle("light-mode");

            const isLight =
                document.body.classList.contains("light-mode");

            localStorage.setItem(
                "dreamforge-theme",
                isLight ? "light" : "dark"
            );
        });
    }

    // ================================
    // CHARACTER COUNT
    // ================================

    function updateCharacterCount() {
        if (!promptInput || !charCount) {
            return;
        }

        charCount.textContent = promptInput.value.length;
    }

    if (promptInput) {
        promptInput.addEventListener(
            "input",
            updateCharacterCount
        );

        updateCharacterCount();
    }

    // ================================
    // TOAST MESSAGE
    // ================================

    function showToast(
        message,
        type = "error"
    ) {
        const oldToast =
            document.getElementById(
                "dreamforgeToast"
            );

        if (oldToast) {
            oldToast.remove();
        }

        const toast =
            document.createElement("div");

        toast.id = "dreamforgeToast";
        toast.className =
            `dreamforge-toast ${type}`;

        const icon =
            type === "success"
                ? "✓"
                : "⚠";

        toast.innerHTML = `
            <div class="toast-icon">
                ${icon}
            </div>

            <div class="toast-message">
                ${message}
            </div>

            <button
                class="toast-close"
                aria-label="Close"
            >
                ×
            </button>
        `;

        document.body.appendChild(toast);

        requestAnimationFrame(() => {
            toast.classList.add("show");
        });

        const closeButton =
            toast.querySelector(
                ".toast-close"
            );

        if (closeButton) {
            closeButton.addEventListener(
                "click",
                () => {
                    toast.classList.remove(
                        "show"
                    );

                    setTimeout(() => {
                        toast.remove();
                    }, 300);
                }
            );
        }

        setTimeout(() => {
            if (
                document.body.contains(toast)
            ) {
                toast.classList.remove(
                    "show"
                );

                setTimeout(() => {
                    if (
                        document.body.contains(
                            toast
                        )
                    ) {
                        toast.remove();
                    }
                }, 300);
            }
        }, 4000);
    }

    // ================================
    // ENHANCE PROMPT
    // ================================

    if (enhanceBtn) {
        enhanceBtn.addEventListener(
            "click",
            () => {
                const currentPrompt =
                    promptInput.value.trim();

                if (!currentPrompt) {
                    showToast(
                        "Please enter a prompt first."
                    );
                    promptInput.focus();
                    return;
                }

                const enhancedPrompt =
                    `${currentPrompt}, highly detailed, cinematic lighting, professional composition, sharp focus`;

                promptInput.value =
                    enhancedPrompt;

                updateCharacterCount();
            }
        );
    }

    // ================================
    // CTRL + ENTER
    // ================================

    if (promptInput) {
        promptInput.addEventListener(
            "keydown",
            (event) => {
                if (
                    event.ctrlKey &&
                    event.key === "Enter"
                ) {
                    event.preventDefault();

                    generateImage();
                }
            }
        );
    }

    // ================================
    // GENERATE IMAGE
    // ================================

    async function generateImage() {
        if (!promptInput) {
            return;
        }

        const prompt =
            promptInput.value.trim();

        if (!prompt) {
            showToast(
                "Please enter a prompt to generate an image."
            );

            promptInput.focus();
            return;
        }

        // Show loading
        if (loadingState) {
            loadingState.style.display = "flex";
        }

        if (generatedResult) {
            generatedResult.style.display = "none";
        }

        if (loadingText) {
            loadingText.textContent =
                "Creating your image...";
        }

        if (generateBtn) {
            generateBtn.disabled = true;
            generateBtn.textContent =
                "Generating...";
        }

        try {
            const response =
                await fetch("/generate", {
                    method: "POST",

                    headers: {
                        "Content-Type":
                            "application/json"
                    },

                    body: JSON.stringify({
                        prompt: prompt
                    })
                });

            let data = null;

            try {
                data =
                    await response.json();
            } catch (jsonError) {
                data = null;
            }

            if (
                !response.ok ||
                !data ||
                !data.success
            ) {
                let errorMessage =
                    "Could not generate the image.";

                if (
                    data &&
                    data.error
                ) {
                    errorMessage =
                        data.error;
                }

                showToast(errorMessage);

                return;
            }

            // ============================
            // SHOW GENERATED IMAGE
            // ============================

            if (generatedImage) {
                generatedImage.src =
                    data.image;

                generatedImage.alt =
                    "Generated AI image";
            }

            if (resultPrompt) {
                resultPrompt.textContent =
                    prompt;
            }

            if (downloadBtn) {
                downloadBtn.href =
                    data.image;

                downloadBtn.download =
                    data.filename ||
                    "dreamforge-image.webp";
            }

            if (generatedResult) {
                generatedResult.style.display =
                    "block";
            }

            // Wait until image is actually loaded
            if (generatedImage) {
                generatedImage.onload = () => {
                    if (loadingState) {
                        loadingState.style.display =
                            "none";
                    }

                    loadGallery();
                };

                generatedImage.onerror = () => {
                    if (loadingState) {
                        loadingState.style.display =
                            "none";
                    }

                    showToast(
                        "The generated image could not be displayed."
                    );
                };
            } else {
                if (loadingState) {
                    loadingState.style.display =
                        "none";
                }

                loadGallery();
            }

            showToast(
                "Image generated successfully!",
                "success"
            );

        } catch (error) {
            console.error(
                "GENERATE ERROR:",
                error
            );

            showToast(
                "Unable to connect to the image generation server."
            );
        } finally {
            if (generateBtn) {
                generateBtn.disabled = false;
                generateBtn.textContent =
                    "Generate";
            }

            // Hide loading if image didn't trigger onload
            setTimeout(() => {
                if (
                    loadingState &&
                    generatedImage &&
                    generatedImage.complete
                ) {
                    loadingState.style.display =
                        "none";
                }
            }, 1000);
        }
    }

    // ================================
    // GENERATE BUTTON
    // ================================

    if (generateBtn) {
        generateBtn.addEventListener(
            "click",
            generateImage
        );
    }

    // ================================
    // LOAD GALLERY
    // ================================

    async function loadGallery() {
        if (!galleryGrid) {
            return;
        }

        try {
            const response =
                await fetch("/gallery");

            const data =
                await response.json();

            if (
                !response.ok ||
                !data.success
            ) {
                throw new Error(
                    "Gallery request failed"
                );
            }

            galleryGrid.innerHTML = "";

            const images =
                Array.isArray(data.images)
                    ? data.images
                    : [];

            if (
                images.length === 0
            ) {
                if (emptyState) {
                    emptyState.style.display =
                        "block";
                }

                return;
            }

            if (emptyState) {
                emptyState.style.display =
                    "none";
            }

            images.forEach(
                (image) => {
                    const card =
                        document.createElement(
                            "div"
                        );

                    card.className =
                        "gallery-card";

                    card.innerHTML = `
                        <div class="gallery-image-wrap">
                            <img
                                src="${image.url}"
                                alt="Generated image"
                                class="gallery-image"
                                loading="lazy"
                            />

                            <a
                                href="${image.url}"
                                download="${image.filename}"
                                class="gallery-download"
                                title="Download image"
                            >
                                ↓
                            </a>
                        </div>

                        <div class="gallery-card-footer">
                            <span>
                                AI Generated
                            </span>

                            <a
                                href="${image.url}"
                                target="_blank"
                                rel="noopener noreferrer"
                                class="gallery-open"
                            >
                                Open
                            </a>
                        </div>
                    `;

                    galleryGrid.appendChild(
                        card
                    );
                }
            );

        } catch (error) {
            console.error(
                "GALLERY ERROR:",
                error
            );

            // Do not show a popup every time
            // the gallery has a small issue.
        }
    }

    // ================================
    // VIEW GALLERY
    // ================================

    const viewGalleryButtons =
        document.querySelectorAll(
            '[href="#gallery"]'
        );

    viewGalleryButtons.forEach(
        (button) => {
            button.addEventListener(
                "click",
                (event) => {
                    event.preventDefault();

                    const gallery =
                        document.getElementById(
                            "gallery"
                        );

                    if (gallery) {
                        gallery.scrollIntoView({
                            behavior: "smooth"
                        });
                    }
                }
            );
        }
    );

    // ================================
    // NAVIGATION LINKS
    // ================================

    document
        .querySelectorAll(
            'a[href^="#"]'
        )
        .forEach((link) => {
            link.addEventListener(
                "click",
                (event) => {
                    const targetId =
                        link.getAttribute(
                            "href"
                        );

                    if (
                        !targetId ||
                        targetId === "#"
                    ) {
                        return;
                    }

                    const target =
                        document.querySelector(
                            targetId
                        );

                    if (target) {
                        event.preventDefault();

                        target.scrollIntoView({
                            behavior: "smooth"
                        });
                    }
                }
            );
        });

    // ================================
    // INITIAL GALLERY LOAD
    // ================================

    loadGallery();
});