/// This script is injected into the page via CDP's Runtime.evaluate.
/// It transverses the DOM, filters out invisible/non-semantic nodes,
/// assigns a unique `data-veil-id` to interactive elements,
/// draws a Set-of-Mark (SoM) overlay on the screen,
/// and returns a minimized JSON tree suitable for LLM consumption.
pub const SEMANTIC_EXTRACTOR_JS: &str = r#"
(function() {
    // 1. Cleanup previous SoM overlay if exists
    const existingOverlay = document.getElementById('veil-som-overlay');
    if (existingOverlay) {
        existingOverlay.remove();
    }

    // 2. Create new SoM overlay container
    const overlay = document.createElement('div');
    overlay.id = 'veil-som-overlay';
    overlay.style.position = 'fixed';
    overlay.style.top = '0';
    overlay.style.left = '0';
    overlay.style.width = '100vw';
    overlay.style.height = '100vh';
    overlay.style.pointerEvents = 'none'; // Click through
    overlay.style.zIndex = '2147483647'; // Max z-index
    
    if (document.documentElement) {
        document.documentElement.appendChild(overlay);
    } else {
        return { type: 'root', children: [], error: 'Document not ready' };
    }

    function isVisible(el) {
        if (!el || el.nodeType !== Node.ELEMENT_NODE) return true;
        const style = window.getComputedStyle(el);
        const rect = el.getBoundingClientRect();
        return style.display !== 'none' && 
               style.visibility !== 'hidden' && 
               style.opacity !== '0' &&
               rect.width > 0 && 
               rect.height > 0;
    }

    // Pass absolute offsets to properly render SoM boxes for iframe contents
    function buildTree(node, indexObj, offsetX = 0, offsetY = 0) {
        if (!node) return null;
        
        if (node.nodeType === Node.TEXT_NODE) {
            let text = node.textContent.trim();
            if (text) return { type: 'text', text: text };
            return null;
        }

        if (node.nodeType !== Node.ELEMENT_NODE) return null;
        if (!isVisible(node)) return null;

        const tagName = node.tagName.toLowerCase();
        
        // Skip non-semantic containers
        if (['script', 'style', 'meta', 'link', 'noscript', 'svg', 'canvas'].includes(tagName)) return null;

        // Skip our own overlay
        if (node.id === 'veil-som-overlay') return null;

        let isInteractive = ['a', 'button', 'input', 'select', 'textarea'].includes(tagName) || 
                            node.getAttribute('role') === 'button' ||
                            node.hasAttribute('onclick');

        let children = [];
        
        // Iframe Piercing MVP (Same-Origin)
        if (tagName === 'iframe') {
            try {
                let iframeDoc = node.contentDocument || node.contentWindow.document;
                if (iframeDoc && iframeDoc.body) {
                    const rect = node.getBoundingClientRect();
                    let parsed = buildTree(iframeDoc.body, indexObj, offsetX + rect.left, offsetY + rect.top);
                    if (parsed) children.push(parsed);
                }
            } catch (e) {
                // Cross-origin blocked
            }
        } else {
            for (let child of node.childNodes) {
                let parsed = buildTree(child, indexObj, offsetX, offsetY);
                if (parsed) children.push(parsed);
            }
        }

        // Condense trees: if a container only has a single text child and is not interactive, just return the text
        if (!isInteractive && children.length === 1 && children[0].type === 'text') {
            return children[0];
        }

        // Only keep if it's interactive, or has meaningful children
        if (isInteractive || children.length > 0) {
            let result = { type: tagName };
            if (isInteractive) {
                indexObj.count++;
                result.vid = indexObj.count; // Veil ID
                
                // Tag the actual DOM so we can query it later via `[data-veil-id="X"]`
                node.setAttribute('data-veil-id', indexObj.count);
                
                if (node.href) result.href = node.href;
                if (node.placeholder) result.placeholder = node.placeholder;
                if (node.value) result.value = node.value;
                if (node.type) result.inputType = node.type;
                if (node.name) result.name = node.name;
                
                let ariaLabel = node.getAttribute('aria-label');
                if (ariaLabel) result.ariaLabel = ariaLabel;

                // --- Draw Set-of-Mark Bounding Box ---
                const rect = node.getBoundingClientRect();
                if (rect.width > 0 && rect.height > 0) {
                    const box = document.createElement('div');
                    box.style.position = 'absolute';
                    box.style.border = '2px solid rgba(255, 0, 0, 0.6)';
                    box.style.backgroundColor = 'rgba(255, 0, 0, 0.05)';
                    box.style.left = (rect.left + offsetX) + 'px';
                    box.style.top = (rect.top + offsetY) + 'px';
                    box.style.width = rect.width + 'px';
                    box.style.height = rect.height + 'px';
                    box.style.boxSizing = 'border-box';
                    
                    const badge = document.createElement('div');
                    badge.innerText = indexObj.count;
                    badge.style.position = 'absolute';
                    badge.style.top = '-12px';
                    badge.style.left = '-2px';
                    badge.style.backgroundColor = 'red';
                    badge.style.color = 'white';
                    badge.style.fontSize = '10px';
                    badge.style.fontWeight = 'bold';
                    badge.style.padding = '0 4px';
                    badge.style.borderRadius = '2px';
                    badge.style.lineHeight = '12px';
                    
                    box.appendChild(badge);
                    overlay.appendChild(box);
                }
            }
            if (children.length > 0) result.children = children;
            return result;
        }
        return null;
    }
    
    let indexObj = { count: 0 };
    return buildTree(document.body, indexObj);
})()
"#;
