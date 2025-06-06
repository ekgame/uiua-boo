# Markdown Rendering Test

This document tests various markdown features to ensure proper rendering.

## Headers

# H1 Header
## H2 Header
### H3 Header
#### H4 Header
##### H5 Header
###### H6 Header

## Text Formatting

**Bold text** and __also bold__

*Italic text* and _also italic_

***Bold and italic*** and ___also bold and italic___

~~Strikethrough text~~

`Inline code` with backticks

> This is a blockquote
> 
> It can span multiple lines
> 
> > And can be nested

## Lists

### Unordered Lists
- Item 1
- Item 2
  - Nested item 2.1
  - Nested item 2.2
    - Deeply nested item
- Item 3

### Ordered Lists
1. First item
2. Second item
   1. Nested numbered item
   2. Another nested item
3. Third item

### Task Lists
- [x] Completed task
- [ ] Incomplete task
- [x] Another completed task

## Links and Images

[Link to Google](https://www.google.com)

[Link with title](https://www.example.com "Example Title")

Reference-style link: [Reference Link][ref]

[ref]: https://www.example.com "Reference Link Title"

Auto-link: https://www.example.com

Email: contact@example.com

## Code Blocks

### Inline Code
Here's some `inline code` in a sentence.

### Fenced Code Blocks

```javascript
function greetUser(name) {
    console.log(`Hello, ${name}!`);
    return `Welcome, ${name}`;
}

greetUser("World");
```

```python
def fibonacci(n):
    if n <= 1:
        return n
    return fibonacci(n-1) + fibonacci(n-2)

print(fibonacci(10))
```

```bash
#!/bin/bash
echo "Hello, World!"
ls -la
cd /home/user
```

### Code Block Without Language
```
This is a plain code block
without syntax highlighting
```

## Tables

| Column 1 | Column 2 | Column 3 |
|----------|----------|----------|
| Row 1, Col 1 | Row 1, Col 2 | Row 1, Col 3 |
| Row 2, Col 1 | Row 2, Col 2 | Row 2, Col 3 |

### Aligned Tables

| Left Aligned | Center Aligned | Right Aligned |
|:-------------|:--------------:|--------------:|
| Left         | Center         | Right         |
| Text         | Text           | Text          |

## Horizontal Rules

---

***

___

## Escape Characters

\*This text is not italic\*

\`This is not code\`

\# This is not a header

## Line Breaks

This is the first line.  
This is the second line with two spaces at the end of the previous line.

This is a new paragraph after a blank line.

## Special Characters and Symbols

© Copyright symbol
® Registered trademark
™ Trademark
° Degree symbol
± Plus-minus
× Multiplication
÷ Division

## Emphasis Combinations

**Bold text with *italic* inside**

*Italic text with **bold** inside*

## Nested Blockquotes

> This is a level 1 quote
> 
> > This is a level 2 quote
> > 
> > > This is a level 3 quote
> > > 
> > > Back to level 2
> 
> Back to level 1

## Mixed Content

Here's a paragraph with **bold**, *italic*, `code`, and a [link](https://example.com).

### Code in Lists

1. First, install the package:
   ```bash
   npm install package-name
   ```

2. Then, import it in your code:
   ```javascript
   import { feature } from 'package-name';
   ```

3. Finally, use it:
   ```javascript
   const result = feature('parameter');
   ```

## Footnotes (if supported)

This text has a footnote[^1].

This text has another footnote[^note].

[^1]: This is the first footnote.
[^note]: This is a named footnote.

## Scary tags

The tags below should be escaped.

<script>alert(1)</script>
<img src=x onerror=alert(1)/>

## End of Test

This markdown file covers most common markdown features. If you're seeing this text properly formatted, your markdown renderer is working correctly!

