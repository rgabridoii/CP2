# Reply Email to Panel

**To:** [Panel Members / Ms. Maureen Terminez and the Capstone Panel]
**Cc:** [Adviser — John Ryan G. Dalmacio]
**Subject:** Group 9 — Revised Capstone Proposal and Response-to-Panel Matrix (ZeroPoint Security)

---

Dear Members of the Panel,

Thank you for the thorough and constructive feedback on our capstone proposal defense. We appreciate the time you took to review our work and to identify the areas that needed strengthening. We have completed a major revision of the manuscript and are submitting it together with a response-to-panel matrix and a summary of changes.

Below is a brief account of how each recommendation was addressed. A point-by-point matrix and a page-referenced change log are included in the accompanying documents.

**1. Title and role of AI.** We revised the title to *"ZeroPoint Security: A Vulnerability Management Platform with AI-Assisted Remediation Guidance."* Throughout the manuscript, we now state clearly that detection is performed by Greenbone/OpenVAS and that the AI only prioritizes findings and generates remediation guidance. The system recommends and tracks remediation actions; it does not automatically apply patches or configuration changes.

**2. Single primary beneficiary.** We narrowed the study to a single primary beneficiary: Philippine small and medium-sized enterprises (SMEs), specifically local computer and IT-service shops that cannot afford enterprise vulnerability-management solutions or a full-time security specialist. Academic institutions and LGUs have been removed from the scope.

**3. Technical consistency.** The manuscript now provides one consistent description. Nuclei is not used or integrated in the system and appears only as a reviewed existing tool and a future enhancement; Greenbone/OpenVAS is the sole scanning engine. The language model is a pretrained, non-fine-tuned open-weights model used strictly through retrieval-augmented generation over a local, versioned collection of authoritative references. AI inference runs fully offline. Because the system is fully containerized, both Linux and Windows (Docker Desktop with WSL2) are supported deployment hosts. The platform recommends and tracks remediation only and does not add web-application testing beyond the capabilities of Greenbone/OpenVAS.

**4. Narrower scope.** We specified the asset types, operating systems, vulnerability classes, target count, scan profiles, and explicit exclusions. The platform is bounded to a small number of internal hosts and web applications on a single LAN segment, scanned by Greenbone/OpenVAS, with clearly stated exclusions.

**5. Research vs. development objectives, measurable RQs.** We separated the objectives into five Development Objectives (implement) and three Research Objectives (measure), and rewrote the research questions to be measurable and answerable using Chapter III. Broad claims about overall cybersecurity posture or reductions in cybercrime were removed.

**6. Complete research methodology.** Scrum is now presented only as the software-development approach. The research methodology comprises a controlled ground-truth detection evaluation and exploratory, formative usability testing, which we explicitly describe as formative given the limited number of representative users.

**7. Detection evaluation redesign.** We replaced the single-target test with a controlled ground-truth environment of documented vulnerable and non-vulnerable targets, with a per-item seed specification and full metrics (true positives, false positives, false negatives, precision, recall, F1, scan duration, coverage by category, and authenticated vs. unauthenticated performance). Comparison is performed on equivalent targets, credentials, feed dates, hardware, and test windows.

**8. Stronger AI evaluation.** The success criterion is no longer output coverage. AI-generated guidance is now assessed for correctness and safety through expert review against authoritative references.

**9. Grounding AI recommendations.** Recommendations are grounded in a local, versioned collection of authoritative materials via retrieval-augmented generation. Each recommendation includes the remediation action, affected platform or version, source references, operational impact, verification steps, rollback considerations, and an uncertainty indicator, and the model may abstain when reliable evidence is unavailable.

**10. Audit log.** We no longer describe the audit log as immutable. It is now described as append-only and tamper-evident using periodic cryptographic checksums, with the limitation stated and stronger guarantees identified as future work.

**11. Privacy and legal discussion.** We corrected the discussion to state that self-hosting does not by itself establish compliance with the Data Privacy Act, and we are verifying and citing the applicable NPC issuances by their correct numbers and titles.

**12. Hardware feasibility.** We revised the minimum hardware requirement. The 8 GB figure has been corrected; the minimum will be established from empirical measurement and is expected to be at least 16 GB.

**13. Reference audit.** A complete reference audit is in progress. Every citation is being opened, read, and verified, and unsupported references will be corrected or removed. The audited list will accompany the final resubmission.

**14. Manuscript completeness.** The front matter has been completed and the remaining template content removed. Figures and screenshots are being finalized and inserted.

**15. Response-to-panel matrix.** A complete response-to-panel matrix is included with this submission.

We will coordinate the exact revision schedule and submission deadline with our adviser. We remain committed to ensuring that the next version is internally consistent, technically supportable, methodologically measurable, and complete in both content and format.

Thank you again for your guidance.

Respectfully,

**Group 9**
Alexandra Paculan · Juan Carlos Castillo · Kevin Angelo Metro · Roberto Gabrido · Ronel E. Cachero
Section S3102 — MO-IT200D1 Capstone 1

*Attachments: (1) Revised Manuscript, (2) Response-to-Panel Matrix and Change Log, (3) Summary of Changes.*
