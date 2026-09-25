// One-time loader for the search-card display profile (SCRUM-6512).
//
// Mounted from SearchLayout — NOT from the Display settings button. The button
// lives in the results switchbar, which unmounts whenever a search clears
// searchResults (every search, page change and facet click), and a load-on-
// mount there re-applied the default profile over whatever the user had:
// unsaved modal tweaks and non-default loaded profiles alike (review finding
// on SCRUM-6512). SearchLayout stays mounted for the whole search session.
//
// The redux value itself is the "already loaded" marker: the profile is
// fetched only while searchDisplayPrefs is null, and the dispatch always
// writes a non-null profile (the stored default, or the built-in defaults
// when the user has none), so the fetch happens once per session and later
// remounts of anything can never clobber the user's working profile.

import { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';

import { usePersonSettings } from '../../settings/usePersonSettings';
import { setSearchDisplayPrefs } from '../../../actions/searchActions';
import {
  SEARCH_DISPLAY_COMPONENT,
  normalizeDisplayPrefs,
} from './searchDisplayPrefs';

export default function useSearchDisplayProfile() {
  const dispatch = useDispatch();
  const accessToken = useSelector((state) => state.isLogged.accessToken);
  const email = useSelector((state) => state.isLogged.email);
  const rawPrefs = useSelector((state) => state.search.searchDisplayPrefs);

  const { load } = usePersonSettings({
    token: accessToken,
    email,
    componentName: SEARCH_DISPLAY_COMPONENT,
    maxCount: 10,
  });

  useEffect(() => {
    if (!accessToken || !email) return;
    if (rawPrefs !== null) return; // loaded or customized this session
    load()
      .then(({ picked }) => {
        const stored = picked?.json_settings?.state;
        dispatch(setSearchDisplayPrefs(normalizeDisplayPrefs(stored)));
      })
      .catch((err) => {
        const msg = err?.response?.data?.detail || err?.message || String(err);
        console.error('Failed to load search display profile:', msg);
      });
  }, [accessToken, email, rawPrefs, load, dispatch]);
}
