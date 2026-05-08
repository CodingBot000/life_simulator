package com.lifesimulator.backend.priorities;

import java.util.List;
import java.util.Map;
import org.springframework.stereotype.Service;

/**
 * Life UI catalog provider for priority choices shown before simulation.
 * These labels and groups are presentation inputs, not engine-core routing policy.
 */
@Service
public class PriorityCatalogService {

  private static final int MAX_SELECTIONS = 3;
  private static final List<PriorityGroupOption> GROUPS = List.of(
    group("core", "공통", "Core"),
    group("career", "커리어", "Career"),
    group("relationship", "관계", "Relationship"),
    group("finance", "재무", "Finance"),
    group("living", "거주", "Living"),
    group("education", "학습", "Education"),
    group("health", "건강", "Health")
  );
  private static final List<PriorityDefinition> DEFINITIONS = List.of(
    priority("stability", "core", "안정성", "Stability"),
    priority("growth", "core", "성장", "Growth"),
    priority("income", "core", "수입", "Income"),
    priority("independence", "core", "독립성", "Independence"),
    priority("future_optionality", "core", "미래 선택지", "Future optionality"),
    priority("quality_of_life", "core", "삶의 질", "Quality of life"),
    priority("career_growth", "career", "커리어 성장", "Career growth"),
    priority("career_opportunity", "career", "커리어 기회", "Career opportunity"),
    priority("compensation", "career", "보상 수준", "Compensation"),
    priority("experience", "career", "경험 확장", "Experience"),
    priority("future_opportunity", "career", "미래 기회", "Future opportunity"),
    priority("long_term_growth", "career", "장기 성장", "Long-term growth"),
    priority("ownership", "career", "주도권", "Ownership"),
    priority("short_term_income", "career", "단기 수입", "Short-term income"),
    priority("compatibility", "relationship", "궁합", "Compatibility"),
    priority("emotional_stability", "relationship", "정서적 안정", "Emotional stability"),
    priority("family_planning", "relationship", "가족 계획", "Family planning"),
    priority("long_term_compatibility", "relationship", "장기적 궁합", "Long-term compatibility"),
    priority("personal_space", "relationship", "개인 공간", "Personal space"),
    priority("relationship_stability", "relationship", "관계 안정성", "Relationship stability"),
    priority("trust", "relationship", "신뢰", "Trust"),
    priority("cost_of_living", "finance", "생활비", "Cost of living"),
    priority("financial_efficiency", "finance", "재무 효율", "Financial efficiency"),
    priority("financial_readiness", "finance", "재정 준비도", "Financial readiness"),
    priority("financial_stability", "finance", "재정 안정성", "Financial stability"),
    priority("future_flexibility", "finance", "미래 유연성", "Future flexibility"),
    priority("safety_net", "finance", "안전망", "Safety net"),
    priority("freedom", "living", "자유", "Freedom"),
    priority("mental_space", "living", "마음의 여유", "Mental space"),
    priority("support_system", "living", "지원 체계", "Support system"),
    priority("time_efficiency", "living", "시간 효율", "Time efficiency"),
    priority("employability", "education", "취업 가능성", "Employability"),
    priority("expertise", "education", "전문성", "Expertise"),
    priority("learning", "education", "학습", "Learning"),
    priority("proof_of_ability", "education", "실력 증명", "Proof of ability"),
    priority("skill_depth", "education", "기술 깊이", "Skill depth"),
    priority("energy_management", "health", "에너지 관리", "Energy management"),
    priority("health", "health", "건강", "Health"),
    priority("stress_management", "health", "스트레스 관리", "Stress management"),
    priority("sustainability", "health", "지속 가능성", "Sustainability"),
    priority("work_life_balance", "health", "워라밸", "Work-life balance")
  );
  private static final Map<String, List<String>> CATEGORY_GROUPS = Map.of(
    "career",
    List.of("core", "career", "education", "finance", "health"),
    "relationship",
    List.of("core", "relationship", "finance", "living", "health"),
    "finance",
    List.of("core", "finance", "career", "living", "education"),
    "living",
    List.of("core", "living", "finance", "career", "health"),
    "education",
    List.of("core", "education", "career", "finance"),
    "health",
    List.of("core", "health", "career", "living"),
    "other",
    GROUPS.stream().map(PriorityGroupOption::id).toList()
  );

  public PriorityCatalog catalog() {
    return new PriorityCatalog(MAX_SELECTIONS, GROUPS, DEFINITIONS, CATEGORY_GROUPS);
  }

  private static PriorityGroupOption group(String id, String ko, String en) {
    return new PriorityGroupOption(id, labels(ko, en));
  }

  private static PriorityDefinition priority(String id, String group, String ko, String en) {
    return new PriorityDefinition(id, group, labels(ko, en));
  }

  private static Map<String, String> labels(String ko, String en) {
    return Map.of("ko", ko, "en", en);
  }

  public record PriorityCatalog(
    int maxSelections,
    List<PriorityGroupOption> groups,
    List<PriorityDefinition> definitions,
    Map<String, List<String>> categoryGroups
  ) {}

  public record PriorityGroupOption(String id, Map<String, String> labels) {}

  public record PriorityDefinition(String id, String group, Map<String, String> labels) {}
}
