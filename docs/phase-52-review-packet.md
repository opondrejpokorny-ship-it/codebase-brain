# Phase 52: Review Packet

This phase adds a reusable review packet utility.

## Implemented

- `src/lib/reviewPacketUtils.js`

The utility builds one product object containing:

- item identity
- title and link
- level
- summary
- changed files
- related files
- suggested tests
- comment draft
- readiness rows and summary

It can also render the packet as Markdown.

## Why this matters

The review queue has multiple useful pieces of information. A packet utility makes those pieces easier to display, copy, export, and later share across agent workflows.
