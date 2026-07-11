import type { Check } from "./types.js";
import {
  contrast, focusRing, reducedMotion, forbiddenValue, logicalProperties, viewportUnits, colorScheme,
  colorTokenOnly, tokenBinding, gradientText, focusForcedColors, focusReshape, zindexScale, containerQuery,
} from "./checks/css.js";
import {
  formLabel, semanticControl, emojiIcon, imgDimensions, imgAlt, headingOrder, targetSize, controlName,
  deadHref, positiveTabindex, externalRel, sri, landmarkMain, skipLink, singleH1, fieldsetGroup,
  genericLinkText, iframeTitle, tableHeaders, duplicateIdRefs, invalidRole, nestedInteractive, listStructure,
} from "./checks/html.js";
import {
  metaViewport, viewportPresence, langValid, htmlLang, documentTitle, metaDescription, canonicalUnique,
  ogTags, viewportFit,
} from "./checks/document.js";

export const CHECKS: Record<string, Check> = {
  contrast, focusRing, reducedMotion, forbiddenValue, formLabel, semanticControl, emojiIcon, imgDimensions, imgAlt, targetSize,
  headingOrder, htmlLang, logicalProperties, viewportUnits, colorScheme, colorTokenOnly, tokenBinding, externalRel, sri,
  metaViewport, viewportPresence, controlName, deadHref, gradientText, positiveTabindex, langValid,
  landmarkMain, skipLink, singleH1, fieldsetGroup, genericLinkText, focusForcedColors, focusReshape, zindexScale, containerQuery,
  iframeTitle, tableHeaders, duplicateIdRefs, viewportFit,
  documentTitle, metaDescription, canonicalUnique, ogTags,
  invalidRole, nestedInteractive, listStructure,
};
