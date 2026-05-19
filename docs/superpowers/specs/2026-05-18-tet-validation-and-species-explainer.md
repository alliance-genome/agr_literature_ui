# Topic classification, automatic cross-validation, and curator validation — what curators need to know

**Status:** draft for curator review (will be moved to Confluence)
**Audience:** curators and pipeline owners
**Last updated:** 2026-05-18

This document explains three things that are often conflated:

1. how **document-level topic tags** are produced by automatic classifiers,
2. how the **server-side cross-validation** between tags actually works, and
3. how the **new "Validation by professional biocurator" column** in the TET validation grid relates to it.

---

## 1. Context

### 1.1 What a TET (topic / entity tag) actually is

Every classifier output, curator decision, or author assertion about a paper is stored as one row in `topic_entity_tag`. The columns that matter for this discussion are:

| column                    | meaning                                                                 |
|---------------------------|-------------------------------------------------------------------------|
| `reference_id`            | the paper                                                                |
| `topic`                   | ATP term that names the topic (e.g. `ATP:0000128` = "disease")          |
| `entity` / `entity_type`  | optional — present for entity-level tags (e.g. a specific gene)         |
| `species`                 | optional taxon curie (e.g. `NCBITaxon:6239` for *C. elegans*)           |
| `negated`                 | `false` = topic is present, `true` = topic is *not* present              |
| `data_novelty`            | ATP term saying *how novel* the data is — "new" / "updated" / "no new data" / "unspecified" (root). Lets curators distinguish "this paper genuinely adds new data on topic X" from "this paper merely re-references known data on topic X". Defaults to `ATP:0000335` ("unspecified"). |
| `topic_entity_tag_source` | which pipeline / curator produced it; carries `validation_type`         |

A **document-level (topic-only) tag** is a TET where `entity` is null. This is what topic classifiers and the ✓ / ✗ "validation" buttons in the grid create.

### 1.2 How automatic topic classifiers create tags

The ML topic classification pipeline (the "ABC topic classifier", run by the literature pipeline team) produces, per paper and per topic:

- `topic` = the ATP term the model was trained for (e.g. `ATP:0000128` for "disease"),
- `negated` = `false` (positive — the topic is present in the paper) or `true` (negative — confidently absent),
- `entity` / `entity_type` = `null` (these are document-level decisions, not entity-level),
- **`species` = `null`** for every model currently in production,
- `data_novelty` = `ATP:0000335` ("unspecified"),
- `topic_entity_tag_source` = an ML source with `source_method = 'abc_document_classifier'` and `validation_type = null` (so these tags do **not** themselves validate any other tag — see §2).

This last point is important: the classifier produces *opinions*. Whether those opinions are right or wrong is decided later by **validating** TETs — tags from sources whose `topic_entity_tag_source.validation_type` is `professional_biocurator` or `author`.

A note on authors: at the database level, author tags do carry `validation_type = 'author'` and the linker treats them the same way as professional-biocurator tags. In practice we don't treat them as a source of *truth* on par with professional curators — author input is unverified and inconsistent in coverage. So in the new UI we deliberately keep author tags **separate** from professional-biocurator validations: they are surfaced as *indications* (signals worth looking at) rather than as validations, and they do not feed the "Validation by professional biocurator" column. The rest of this document talks about validation as a curator-driven process; everything about author tags should be read as "the same machinery applies in the DB, but we present it differently in the UI."

### 1.3 What a validation tag is

A **validation tag** is any TET whose source is marked as authoritative — today that means tags produced either by a professional curator or by an author. There are two kinds:

- **professional biocurator** — produced by professional curators. The new TET validation grid's ✓/✗ buttons create one of these.
- **author** — produced by the author-curation flow.

When a new TET arrives, the system looks at every other tag already attached to the same paper (from the same data provider — i.e. the same MOD) and decides which of them this new tag confirms or contradicts. Those links are recorded as validation relationships and stored alongside the tags.

The validation state of a paper is **recomputed every time a tag on that paper is created, updated, or deleted**. So a single curator click that creates or removes a validation tag can flip the validation summary of every other tag on the paper that links to it — there is no stale cache, and there is no need to "trigger" revalidation manually.

Each tag then carries two summary values, computed from the validation links pointing at it: one summarizing what professional biocurators have said, and one summarizing what authors have said. Each value is one of:

- **validated right** — every tag that validates this one agrees with it (all positive when the tag is positive, all negative when the tag is negative).
- **validated wrong** — every tag that validates this one disagrees with it.
- **validation conflict** — the tags that validate this one disagree among themselves.
- **validated right (self)** — the tag is itself authoritative and no other tag of the same kind has been linked as a validation of it.
- **not validated** — no tag of this kind has been linked as a validation of it.

This is the **real validation**. It runs server-side, persists with the tags, and feeds reports, dashboards, training-set curation, and active-learning loops. The new UI column is a *separate* construct (see §3).

---

## 2. How cross-validation actually links two tags

Before walking any of the rules below, the system only considers candidate tag pairs that already pass two basic filters:

- **Same paper.** Tags from different references never link.
- **Same data provider** (same MOD). Curators only validate tags produced for their own data provider — there is no cross-provider validation.

For each candidate pair, the linker walks three rules. They are deliberately *asymmetric* between the "more generic" and "more specific" sides.

### 2.1 Topic hierarchy

Topics live in an ATP tree. The rules treat the tree as the carrier of meaning. To make the examples concrete we'll use a real fragment of the tree: **phenotype** (`ATP:0000009`) has child **genetic phenotype** (`ATP:0000079`), which in turn has children **RNAi phenotype** (`ATP:0000082`) and **overexpression phenotype** (`ATP:0000084`).

Two things drive what happens when two tags meet:

1. **Where they sit on the tree.** A positive tag only links to existing tags whose topic is **the same or more generic** (an ancestor); a negative tag only links to existing tags whose topic is **the same or more specific** (a descendant). Siblings never link.
2. **Whether their polarities match.** Once two tags are linked, the polarities tell us whether the existing tag has been confirmed or contradicted: same polarity → the existing tag becomes "validated right"; opposite polarity → "validated wrong".

Same-polarity examples (the existing tag gets *confirmed*):

- Positive ↔ positive (up the tree). A positive "paper has genetic phenotype data" links to and confirms an existing positive "paper has phenotype data" — if there is genetic phenotype data, then there is phenotype data.
- Negative ↔ negative (down the tree). A "paper does not have phenotype data" tag links to and confirms an existing "paper does not have RNAi phenotype data" tag — if there is no phenotype data at all, then there is no RNAi phenotype data.

Mixed-polarity examples (the existing tag gets *contradicted*):

- Positive ↔ negative (up the tree). A positive "paper has genetic phenotype data" also links to an existing "paper does not have phenotype data", but with opposite polarities: the existence of genetic phenotype data contradicts the claim that the paper has no phenotype data at all. The existing negative tag becomes "validated wrong".
- Negative ↔ positive (down the tree). A "paper does not have phenotype data" links to an existing positive "paper has RNAi phenotype data" the same way: the new negative claims there's no phenotype data, which contradicts the existing positive claim that there is RNAi phenotype data. The existing positive becomes "validated wrong".

What never links: siblings (e.g. "RNAi phenotype" vs. "overexpression phenotype"), and pairs where the new tag's polarity points the wrong way along the tree. For instance, a positive "paper has phenotype data" does **not** link to an existing positive "paper has RNAi phenotype data" — the new tag is the *more generic* one, so it isn't strong enough to confirm or contradict a claim about a specific child topic. (The reverse direction — a positive "RNAi phenotype" arriving after an existing "phenotype" tag — *does* link, because then the new tag is the more specific one.)

Validation works **both ways** every time a tag is created: the new tag can validate existing tags on the paper, *and* existing tags on the paper can validate the new tag. Both directions run, using the same tree-walk, and both directions can produce validation links.

In the other direction — existing tags validating the new tag — the same tree rule applies, just read the other way:

- A new tag is validated by an **existing positive** tag with a **more specific** topic (the specific positive case confirms the more general claim, or contradicts a more general negative claim).
- A new tag is validated by an **existing negative** tag with a **more generic** topic (the broader denial confirms a narrower negative claim, or contradicts a narrower positive claim).

### 2.2 Entity rule

Topic-only tags (`entity is null`) act as wildcards over entity-level tags:

- If the existing tag has no entity, the new tag's entity is ignored — they pair on the topic alone.
- If the existing tag has an entity, the new tag's entity_type + entity must match.

There are also two special cases for "pure entity-only" tags (where `topic == entity_type`, e.g. a "gene" tag whose topic *is* `gene`) — these can pair with mixed topic + entity tags for the same entity, in either direction depending on polarity.

### 2.3 Species rule

The species rule has the **same shape** as the topic rule from §2.1. The trick is to read **`null` species as "more generic"** (the assertion applies regardless of species — broader scope) and **a specific species as "more specific"** (the assertion applies only to that species — narrower scope). Once you accept that mapping, everything we already said about positives, negatives and mixed cases carries over.

Same-polarity examples:

- **Positive ↔ positive** (specific validates more generic). A positive *C. elegans* tag validates an existing positive null-species tag — the existence of *C. elegans* data confirms the broader claim that the paper has the data for some organism.
- **Negative ↔ negative** (generic validates more specific). A null-species "paper does not have phenotype data" validates an existing *C. elegans*-specific "paper does not have phenotype data for *C. elegans*" — the broader denial confirms the narrower one.

Mixed-polarity examples:

- **Positive ↔ negative**. A positive *C. elegans* tag also links to an existing null-species **negative** for the same topic, but with opposite polarities: the existence of *C. elegans* data contradicts the broader denial. The existing negative tag becomes "validated wrong".
- **Negative ↔ positive**. A null-species negative also links to an existing *C. elegans*-specific **positive** for the same topic: the broader denial contradicts the narrower positive claim. The existing positive becomes "validated wrong".

What never links: pairs where the tree direction is wrong for the polarity — exactly the same shape as the wrong-direction case in §2.1. For example, a *C. elegans*-specific negative does **not** validate an existing null-species tag of either polarity, because the existing tag is the *more generic* one in species terms — and a negative tag only validates things that are the same or *more specific* than itself.

Validation also still works both ways here: an existing tag can validate a new tag under the same rules, just read in the other direction (an existing specific-species positive can validate a new null-species positive of a more generic topic, and so on).

In plain English: **a `null` species means "this assertion applies regardless of species"; a specific species means "this assertion only applies to that species."** This is correct when classifiers really are species-agnostic. We will see in §4 why it is *wrong* when they are not.

### 2.4 Data novelty rule

Same shape as the topic rule, but on the data-novelty ATP subtree:

- Positive tags validate existing tags whose data novelty is **the same or more generic** (ancestor).
- Negative tags validate existing tags whose data novelty is **the same or more specific** (descendant).

Because ML classifiers default to `ATP:0000335` ("unspecified") — the **root** of the novelty subtree — and curator validation tags also default to "unspecified" today, this rule is effectively a no-op in the common case. But it *does* fire as soon as either side picks a more specific novelty term, and it can silently prevent a pair from linking that a curator expected to link.

### 2.5 What "validated right" / "validated wrong" / "validation conflict" actually mean

Once all the links above have been computed, the validation status of any one tag is just a roll-up of the polarities of the tags that have been linked as validating it (for the kind of validation being computed — professional biocurator or author):

- If every tag that validates it agrees with it → **validated right**.
- If every tag that validates it disagrees with it → **validated wrong**.
- If the tags that validate it disagree among themselves → **validation conflict**.
- If nothing validates it but the tag is itself authoritative → **validated right (self)**.
- If nothing validates it and the tag is not itself authoritative → **not validated**.

So the curator-side validation status of a classifier tag is *fully determined* by the polarity of the curator topic-only tags that ended up linked to it under the topic / species / data-novelty / entity rules above.

---

## 3. The new UI column vs. the real validation

The new validation grid has a column called **"Validation by professional biocurator"**. Despite the name, this column is **not** the database-level validation summary from §2. It is a separate, curator-facing view of one specific thing: *what curators have already said about this topic on this paper.*

For each (paper, topic) cell, the column looks only at the topic-level tags created directly by professional curators (no machine-learning tags, no author tags, no entity-level tags). Then:

- If no curator has said anything yet for that (paper, topic), the cell shows two buttons — **✓** and **✗** — so the curator can submit a positive or negative validation tag of their own.
- If at least one curator has already weighed in, the cell shows a status pill instead:
  - **positive** — every curator so far has said the topic is present,
  - **negative** — every curator so far has said the topic is absent,
  - **validation conflict** — curators disagree among themselves.

Below the pill, the cell lists the contributing curators, their source icons, and (now) species badges showing the species each curator scoped their tag to.

In other words, **this column summarizes curator votes. It does not run the §2 cross-validation rules** — it does not walk the topic hierarchy, it does not apply the species rule, it does not consult data novelty. It just looks at the professional-curator topic-only tags directly attached to that one (paper, topic) cell.

The connection to the real validation (§2) is indirect but always present:

- Whenever a curator clicks ✓ or ✗ in this column, a new professional-biocurator validation tag is created on the paper. The server immediately runs the §2 rules on it — linking it to every other tag on the paper that it can validate or that can validate it, and recomputing the "validated right / wrong / conflict / not validated" summary for all of those tags.
- So this column *drives* the real validation even though it does not directly display it. The pill the curator sees in this column is a summary of curator votes only; the real validation values of the classifier tags (validated right / wrong / conflict / not validated) are not shown in the topic grid at all — they surface in the **detailed TET table** on each paper's page.

Why two views: a curator looking at one row across many topics doesn't want to read a long string of validation values per cell just to answer "has any curator weighed in on this yet?". The new column collapses that question to a single badge and gives the curator a one-click way to weigh in themselves.

---

## 4. The C. elegans problem

After today's curator conversation, here is the issue, concretely.

### 4.1 What the classifiers say

Today, every production ABC topic classifier emits TETs with `species = null`. Two concrete examples discussed at the curator meeting: the **disease model** classifier and the **catalytic activity** classifier.

The classifiers' *training data* is more nuanced. Even within the same set of classifiers, the curators who produced the training sets and who keep validating predictions in the curation-status form (both at Caltech and in the ABC) used different definitions of positive and negative:

- **Catalytic activity (Kimberly).** Trained and validated as a **species-agnostic** topic. Kimberly has been consistent on this over the years, both in her Caltech curation-status entries and in the ABC.
  - *Positive examples*: a paper measuring catalytic activity of a *C. elegans* enzyme; a paper measuring catalytic activity of a yeast or human ortholog; a paper measuring catalytic activity of a purified protein where the species isn't even specified. All three are **positive** because the topic is present, regardless of organism.
  - *Negative examples*: a paper that does not mention catalytic activity at all, for any species — for instance a paper purely about gene expression patterns, or about behavior, or about anatomy, with no catalytic-activity content anywhere. The topic is genuinely absent regardless of organism, so it's a clear negative under Kimberly's definition.
  - Kimberly's view on this: for some topics being too species-specific may actually *confuse* the model, because the surface language of papers describing catalytic activity is very similar across species — asking a text classifier to decide whether the catalytic activity in a paper is specifically for *C. elegans* may be too hard a problem to learn.
- **Disease model (Ranjana).** Trained and validated as a **species-specific** topic, scoped to *C. elegans*. She has been just as consistent on this in her own curation-status entries.
  - *Positive examples*: a paper describing a *C. elegans* model of Parkinson's disease; a paper describing a *C. elegans* gene as an ortholog of a human disease gene *and* characterizing it in *C. elegans*. Both are **positive** because the paper contains *C. elegans* disease data.
  - *Negative examples*: a paper characterizing a Parkinson's disease model in *Drosophila*, with no *C. elegans* counterpart studied; a paper studying a human disease gene in mouse and rat models, with no *C. elegans* work anywhere in the paper. Both are **negative** under Ranjana's definition because there is no *C. elegans* disease data — even though the *topic* of "disease" is unambiguously present for some other organism. A species-agnostic curator (or classifier) trained on the same papers **may have called both of these positive**, because the paper does contain disease data for *some* organism. This is exactly the kind of paper where the two definitions diverge.

Different curators have, in good faith, used different definitions across topics, and the choice is sometimes deliberate (Kimberly's argument about surface-language overlap) rather than an oversight.

#### Historical workaround at Caltech, and why the ABC lets us drop it

At Caltech we used to handle this kind of mismatch with a pair of overlapping tags: papers were marked **`svm_positive, curation_negative`** for cases where the *language* of a topic was clearly present in the paper (so the SVM rightly fired on it) but the paper itself was not relevant for curation — typically because the work was done in a non-*C. elegans* organism. That tag combination is, in some sense, exactly the same problem we are dealing with here: the language overlap between species means that a paper "positive at the language level" is not necessarily "positive at the curation level".

The ABC gives us a much cleaner way to express this distinction. Instead of carrying the language-vs-curation gap in special tag combinations or free-text notes, we can record each model's training-set definition explicitly on the TET tag itself, via the `species` column:

- A classifier trained on a species-agnostic definition emits TETs with `species = null`. Both training metrics and curator validation then naturally treat the tag as a claim about the topic, regardless of organism.
- A classifier trained on a species-specific definition (say, *C. elegans*) emits TETs with `species = NCBITaxon:6239`. Validation and training metrics then naturally restrict to claims about that species, exactly matching the curator's intent.

Because each model carries its own definition on its tags, **different curators can keep their own definitions for the topics they own, and everything downstream stays consistent**: the validation rules in §2 link the right tags, accuracy / precision / recall metrics over the training and test sets are computed against the *same* definition the curator used, and curators looking at a paper later see exactly which species the call was scoped to. No special tag combinations and no free-text annotations needed.

The classifier output does not currently carry this distinction. A `null` species means "no claim about species" *to the validation linker*, regardless of how the model was actually trained. The full list of WB classifiers in production at the ABC, with the curator most likely to own each topic and the working definition where we know it, is in §5.2 below.

### 4.2 What happens when a curator validates with a specific species

Suppose a paper has a "disease, positive, null species" classifier tag.

A curator opens the new column for the disease topic and clicks **✓ positive**. The validation modal pre-fills the species to the curator's default taxon — for the sake of the example, say *C. elegans* (`NCBITaxon:6239`):

- New tag: positive, species `NCBITaxon:6239`.
- Existing classifier tag: positive, species `null`.
- Species rule for positive new tag: `existing.species is None or existing.species == new.species` → existing is `null` → **rule passes**.
- Topic rule: same topic → passes.
- The two tags are linked. The classifier tag becomes `validated_right` (both agree the topic is present).

Now suppose the curator clicks **✗ negative** instead, again with the pre-filled species:

- New tag: negative, species `NCBITaxon:6239`.
- Existing classifier tag: positive, species `null`.
- Species rule for negative new tag: `new.species is None or existing.species == new.species` → `new.species` is *not* None, and `existing.species (= None) != new.species` → **rule fails**.
- The two tags are **not** linked. The classifier tag stays `not_validated` from this curator.

This asymmetry is **deliberate and correct** when classifiers are genuinely species-agnostic. Reasoning: a curator who says "the paper has no *C. elegans* disease data" has not contradicted a species-agnostic classifier that said "the paper has disease data (for some organism)." Both can be true if the paper has disease data only for human.

But it is **incorrect** when the classifier was actually trained on a species-specific definition:

- If a disease classifier predicts "positive" only when there is *C. elegans* disease data, then a curator's "no *C. elegans* disease data" negative tag is the right rebuttal. The classifier prediction is wrong, and `validation_by_professional_biocurator` should flip to `validated_wrong`. Under the current rules, it stays `not_validated` because the species rule blocks the link.
- Worse, the asymmetric handling means a curator's *C. elegans* **positive** *will* validate the same classifier as `validated_right`. So the classifier's metrics look one-sided: it accumulates positive validations from curators easily, but never accumulates negative validations from curators who validate with a species. That biases every downstream metric and every active-learning loop fed from these labels.

### 4.3 The same problem from the new UI's perspective

The new "Validation by professional biocurator" column never sees this problem directly — it just shows the curator's vote. But the curator's *interpretation* of what their click means is the issue:

- If a curator clicks ✗ "negative" expecting that this will mark the classifier tag wrong (because they read the column as "validate the classifier"), they will be surprised to see the classifier tag remain `not_validated` once they go back to the per-paper view or to a dashboard.
- If they clear the species (set it to `null`), their negative *will* link and the classifier tag will become `validated_wrong` — but the curator may not realize that's what is happening, and they may also not actually want to make a species-agnostic claim.

Hence the design of the new column: every validation modal exposes the species, defaults it to the curator's default taxon when there is exactly one, and lets the curator clear it or change it. But that fix only works if curators *understand* what `null` vs. a specific species means for downstream validation.

### 4.4 Other columns that quietly affect validation

The same kind of mismatch can happen on other columns. Two to watch:

- **Data novelty.** Classifier tags use `ATP:0000335` (root). If a curator picks a more specific novelty term for their validation, the data-novelty rule will refuse to link the pair for negatives (curator more specific) and behave normally for positives. If you genuinely want to validate the classifier, leave novelty at "unspecified."
- **Entity / entity_type.** The classifiers we are talking about here produce topic-only tags. If anyone ever produces curator validation tags at the entity level for these topics, the entity rule will refuse to link them to the topic-only classifier tags except in specific cases.

These rules are not bugs — they exist so that a curator looking at a specific subtopic / specific species / specific data-novelty isn't taken to be contradicting a more general claim. But they have to be understood when reading or producing validation tags.

---

## 5. Proposed solution

This is the part to discuss with curators before any code is written or model is retrained.

### 5.1 Make every species-specific classifier emit `species` explicitly

For every existing topic classifier, the pipeline owner should answer one question:

> When you labeled training examples as positive / negative, did you require the topic to apply to a specific species, or did you accept any organism?

For models in the first group (the species-specific set — *C. elegans*-only, rat-only, etc.):

- Set the `species` column on the corresponding `ml_model` row to that taxon (e.g. `NCBITaxon:6239` for a *C. elegans*-only classifier). The pipeline already reads this column and stamps it onto every TET the model emits — no code change is needed in the pipeline itself.
- Retroactively patch existing classifier TETs for these models (one-shot DB update). After the patch, the validation values for every linked tag are recomputed automatically (validation is recomputed on every TET create / update / delete — see §1.3).

For models in the second group (genuinely species-agnostic):

- Leave the `ml_model.species` column null. No action needed.

The asymmetry in the species rule then does the right thing in both cases: a curator's species-specific negative will correctly mark a same-species classifier `validated_wrong`, and it will correctly *not* mark a species-agnostic classifier as wrong.

#### Configurable default species in the new topic grid

In parallel with the `ml_model.species` work above, we are planning to make the new topic-grid validation column **configurable**:

- Each curator will be able to set their own default species for the validation modal (single-cell ✓/✗ and bulk) — useful when a curator works mostly on one species but occasionally needs to scope to another, or wants species-agnostic by default.
- The grid will also support a **per-topic overall default** derived from the production model for that topic: if the production classifier for *disease model* is the *C. elegans*-specific one, the default species for ✓/✗ clicks on the *disease model* column becomes *C. elegans*; if the production classifier for *catalytic activity* is species-agnostic, the default for that column becomes null. The curator can always override per click; this is just the starting value.

This is a UI-side ergonomics layer on top of the same `species` column we are using for the pipeline change above — curators stay aligned with whichever definition the production model is using, without having to remember it for each topic. We can ship this once the §5.2 table is filled in, since the per-topic defaults read directly from `ml_model.species` for the row marked production.

### 5.2 Standardize the curator definitions

Before patching anything, we should poll every curator who has authored a training set:

1. Topic and topic ATP term.
2. Working definition of "positive" (what counts, what doesn't).
3. Working definition of "negative" (in particular: species-specific vs. species-agnostic).
4. Whether the model trained on it has been retrained since the definition shifted.

The table below is the starting point. Each row is one of the eleven WB document classifiers currently in production at the ABC. The "Responsible curator" column lists the curator we believe owns each topic; the "Definition" column lists the working definition where we already know it. Blank cells in either column still need to be filled in. Treat this table as the source of truth for §5.1 once it is complete.

| Topic                        | ATP curie     | Responsible curator | Definition                          |
|------------------------------|---------------|---------------------|-------------------------------------|
| gene expression in wild type | `ATP:0000041` | Daniela             |                                     |
| catalytic activity           | `ATP:0000061` | Kimberly            | species-agnostic                    |
| transporter function         | `ATP:0000062` |                     |                                     |
| genetic interaction          | `ATP:0000068` | Jae                 |                                     |
| physical interaction         | `ATP:0000069` | Jae                 |                                     |
| regulatory interaction       | `ATP:0000070` |                     |                                     |
| RNAi phenotype               | `ATP:0000082` |                     |                                     |
| variation phenotype          | `ATP:0000083` |                     |                                     |
| overexpression phenotype     | `ATP:0000084` |                     |                                     |
| antibody                     | `ATP:0000096` | Daniela             |                                     |
| disease model                | `ATP:0000152` | Ranjana             | species-specific (*C. elegans*)     |

A sample question to settle each unknown, when we meet the responsible curator: *"If a paper reports the topic in a non-C. elegans organism but not in C. elegans, did you label it positive or negative?"* — a species-agnostic curator says positive; a *C. elegans*-specific curator says negative.

If a curator turns out to have been **inconsistent** in the past (some training examples labeled species-agnostic, others *C. elegans*-specific, for the same topic), we don't have to throw the training set away. The legacy Caltech tags give us a way to clean it up: papers carrying notes like `svm_positive, curation_negative` (or similar workarounds) are exactly the ones where the curator's intent diverged from the literal language-level call, and we can review them to figure out which definition the curator actually meant on each. From that review we can rebuild a more consistent training set for the topic and then decide — together with the curator — whether to retrain as **species-agnostic** or **species-specific**, and stamp the appropriate value on the `ml_model.species` column going forward.

### 5.3 Let curators continue to choose species in the UI

The new validation grid already supports this:

- When the curator's data provider has exactly one default taxon, the species defaults to that taxon in both the single-cell modal and the bulk-validation modal.
- When the data provider covers multiple taxa, the species starts blank.
- Curators can clear or change it on a per-validation basis.
- Each curator's tag is rendered as a species badge (first letter, full binomial on hover) in the validation column, so anyone reading the column can see at a glance which species the validation was scoped to.

This means a curator who wants to make a species-agnostic claim only has to clear the autocomplete; a curator who wants to scope to a specific species doesn't have to do anything.

### 5.4 What we are *not* doing

- We are not changing the cross-validation rules in `topic_entity_tag_crud.py`. The asymmetric handling of `null` vs. specific species is correct semantically; the bug is in the classifier outputs, not the linker.
- We are not removing the default species. The default reflects the most common curator intent. Curators who want a species-agnostic validation tag can clear the field.
- We are not auto-setting `species` on classifier outputs without confirming the model's training definition. A wrong default would silently produce `validated_wrong` everywhere.

---

## 6. Action items

- **Schedule a meeting with each responsible curator to confirm the species definition** (species-agnostic vs. *C. elegans*-specific) for every empty row in the table in §5.2. The sample question to settle each: *"If a paper reports the topic in a non-C. elegans organism but not in C. elegans, did you label it positive or negative?"*
- For every classifier confirmed as species-specific, set the `species` column on its `ml_model` row to the relevant taxon. No pipeline code change needed; the pipeline already stamps that value onto its TET output.
- Retroactively patch the `species` value on existing classifier TETs for those species-specific models. Validation values for every linked tag will recompute automatically.
- Curators (now): use the new validation column. The default species reflects the most common curator intent; clear it when you mean "any organism".
