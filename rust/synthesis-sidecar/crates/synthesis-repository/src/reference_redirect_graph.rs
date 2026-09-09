use crate::ReferenceRedirectFactRecord;
use std::collections::{BTreeMap, BTreeSet, VecDeque};

#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct ReferenceRedirectGraph {
    targets: BTreeMap<String, String>,
}

#[derive(Clone, Debug, PartialEq, Eq)]
pub struct RemovedReferenceRedirect {
    pub from_canonical_reference_id: String,
    pub to_canonical_reference_id: String,
}

pub fn is_explicit_reference_redirect_reason(reasons_json: &str) -> bool {
    reasons_json.contains("reverse_accept")
        || reasons_json.contains("manual_target")
        || reasons_json.contains("canonical_revision_manual_merge")
}

pub fn rank_reference_redirect_roots(
    mut explicit_targets: Vec<(String, i64)>,
    mut accepted_binding_targets: Vec<String>,
    mut automatic_targets: Vec<(String, i64)>,
) -> Vec<String> {
    let rank = |targets: &mut Vec<(String, i64)>| {
        targets.sort_by(|left, right| right.1.cmp(&left.1).then_with(|| left.0.cmp(&right.0)));
    };
    rank(&mut explicit_targets);
    rank(&mut automatic_targets);
    accepted_binding_targets.sort();
    let mut seen = BTreeSet::new();
    explicit_targets
        .into_iter()
        .map(|(target, _)| target)
        .chain(accepted_binding_targets)
        .chain(automatic_targets.into_iter().map(|(target, _)| target))
        .filter(|target| seen.insert(target.clone()))
        .collect()
}

impl ReferenceRedirectGraph {
    pub fn from_records(records: &[ReferenceRedirectFactRecord]) -> Result<Self, String> {
        let mut targets = BTreeMap::new();
        for record in records {
            if record.from_canonical_reference_id.is_empty()
                || record.to_canonical_reference_id.is_empty()
                || record.from_canonical_reference_id == record.to_canonical_reference_id
                || targets
                    .insert(
                        record.from_canonical_reference_id.clone(),
                        record.to_canonical_reference_id.clone(),
                    )
                    .is_some()
            {
                return Err("reference_redirect_invalid".into());
            }
        }
        Ok(Self { targets })
    }

    pub fn resolve(&self, canonical_id: &str) -> Result<String, String> {
        if canonical_id.is_empty() {
            return Err("invalid_request".into());
        }
        let mut current = canonical_id;
        let mut visited = BTreeSet::new();
        while let Some(target) = self.targets.get(current) {
            if !visited.insert(current.to_owned()) {
                return Err("canonical_redirect_cycle".into());
            }
            current = target;
        }
        Ok(current.to_owned())
    }

    pub fn validate_acyclic(&self) -> Result<(), String> {
        for source in self.targets.keys() {
            self.resolve(source)?;
        }
        Ok(())
    }

    pub fn target(&self, source: &str) -> Option<&str> {
        self.targets.get(source).map(String::as_str)
    }

    pub fn edges(&self) -> impl Iterator<Item = (&str, &str)> {
        self.targets
            .iter()
            .map(|(source, target)| (source.as_str(), target.as_str()))
    }

    pub fn remove_source(&mut self, source: &str) -> Option<RemovedReferenceRedirect> {
        self.targets
            .remove(source)
            .map(|target| RemovedReferenceRedirect {
                from_canonical_reference_id: source.to_owned(),
                to_canonical_reference_id: target,
            })
    }

    pub fn merge(&mut self, source: &str, target: &str) -> Result<bool, String> {
        self.validate_acyclic()?;
        let source_root = self.resolve(source)?;
        let target_root = self.resolve(target)?;
        if source_root == target_root {
            return Ok(false);
        }
        self.targets.insert(source_root, target_root);
        self.validate_acyclic()?;
        Ok(true)
    }

    pub fn reroot(&mut self, preferred_root: &str) -> Result<bool, String> {
        self.validate_acyclic()?;
        let current_root = self.resolve(preferred_root)?;
        if current_root == preferred_root {
            return Ok(false);
        }
        self.targets.remove(preferred_root);
        self.targets.insert(current_root, preferred_root.to_owned());
        self.validate_acyclic()?;
        Ok(true)
    }

    pub fn cycles(&self) -> Vec<Vec<String>> {
        let mut completed = BTreeSet::new();
        let mut cycles = Vec::new();
        for start in self.targets.keys() {
            if completed.contains(start) {
                continue;
            }
            let mut path = Vec::new();
            let mut positions = BTreeMap::new();
            let mut current = start.as_str();
            while let Some(target) = self.targets.get(current) {
                if let Some(position) = positions.get(current).copied() {
                    let mut cycle = path[position..].to_vec();
                    cycle.sort();
                    cycles.push(cycle);
                    break;
                }
                if completed.contains(current) {
                    break;
                }
                positions.insert(current.to_owned(), path.len());
                path.push(current.to_owned());
                current = target;
            }
            completed.extend(path);
        }
        cycles.sort();
        cycles
    }

    pub fn repair_cycles(&mut self, preferred_roots: &[String]) -> Vec<RemovedReferenceRedirect> {
        let mut removed = Vec::new();
        for cycle in self.cycles() {
            let selected = preferred_roots
                .iter()
                .find(|candidate| cycle.contains(candidate))
                .cloned()
                .or_else(|| cycle.first().cloned());
            if let Some(selected) = selected
                && let Some(edge) = self.remove_source(&selected)
            {
                removed.push(edge);
            }
        }
        removed
    }

    pub fn component(&self, canonical_id: &str) -> BTreeSet<String> {
        let mut adjacency = BTreeMap::<String, BTreeSet<String>>::new();
        for (source, target) in &self.targets {
            adjacency
                .entry(source.clone())
                .or_default()
                .insert(target.clone());
            adjacency
                .entry(target.clone())
                .or_default()
                .insert(source.clone());
        }
        let mut result = BTreeSet::new();
        let mut queue = VecDeque::from([canonical_id.to_owned()]);
        while let Some(current) = queue.pop_front() {
            if !result.insert(current.clone()) {
                continue;
            }
            queue.extend(adjacency.get(&current).into_iter().flatten().cloned());
        }
        result
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    fn redirect(source: &str, target: &str) -> ReferenceRedirectFactRecord {
        ReferenceRedirectFactRecord {
            from_canonical_reference_id: source.into(),
            to_canonical_reference_id: target.into(),
            ..ReferenceRedirectFactRecord::default()
        }
    }

    #[test]
    fn reroots_direct_and_long_components_without_losing_members() {
        let mut direct = ReferenceRedirectGraph::from_records(&[redirect("a", "b")]).unwrap();
        assert!(direct.reroot("a").unwrap());
        assert_eq!(direct.target("b"), Some("a"));
        assert_eq!(direct.resolve("a").unwrap(), "a");
        assert_eq!(direct.resolve("b").unwrap(), "a");

        let mut chain = ReferenceRedirectGraph::from_records(&[
            redirect("a", "b"),
            redirect("b", "c"),
            redirect("d", "b"),
        ])
        .unwrap();
        assert!(chain.reroot("a").unwrap());
        assert_eq!(chain.target("a"), None);
        assert_eq!(chain.target("c"), Some("a"));
        for member in ["a", "b", "c", "d"] {
            assert_eq!(chain.resolve(member).unwrap(), "a");
        }
    }

    #[test]
    fn repairs_cycles_by_preference_then_stable_fallback() {
        let mut graph = ReferenceRedirectGraph::from_records(&[
            redirect("a", "b"),
            redirect("b", "a"),
            redirect("c", "b"),
            redirect("x", "y"),
            redirect("y", "x"),
        ])
        .unwrap();
        let removed = graph.repair_cycles(&["b".into()]);
        assert_eq!(removed.len(), 2);
        assert_eq!(graph.resolve("a").unwrap(), "b");
        assert_eq!(graph.resolve("c").unwrap(), "b");
        assert_eq!(graph.resolve("y").unwrap(), "x");
        assert!(graph.validate_acyclic().is_ok());
        assert!(graph.repair_cycles(&[]).is_empty());
    }

    #[test]
    fn merging_an_existing_component_is_idempotent() {
        let mut graph = ReferenceRedirectGraph::from_records(&[redirect("a", "b")]).unwrap();
        assert!(!graph.merge("a", "b").unwrap());
        assert_eq!(graph.edges().count(), 1);
    }

    #[test]
    fn root_evidence_prefers_explicit_then_binding_then_automatic() {
        assert_eq!(
            rank_reference_redirect_roots(
                vec![("explicit-old".into(), 1), ("explicit-new".into(), 2)],
                vec!["binding".into()],
                vec![("automatic".into(), 3), ("binding".into(), 4)],
            ),
            vec!["explicit-new", "explicit-old", "binding", "automatic"]
        );
        assert!(is_explicit_reference_redirect_reason(
            "[\"reverse_accept\"]"
        ));
        assert!(!is_explicit_reference_redirect_reason(
            "[\"automatic_match\"]"
        ));
    }
}
