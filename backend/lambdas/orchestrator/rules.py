"""규칙 기반 혈당 패턴 → 감별 가설 엔진.

소수점 "확률"을 노출하지 않는다. 전문가가 손으로 부여한 가중치는 보정된 확률이
아니므로, 내부적으로만 정수 coarse 가중치(1순위 +2, 그 외 +1)로 동점을 깨고
바깥으로는 정렬된 가설 코드 리스트(ranked_hypotheses)만 반환한다.

AWS 의존이 없어 단위 테스트 가능. (handler.py에서 import)
"""

# 가설 코드 → RAG 검색 키워드 (쿼리 정밀화용)
H_QUERY_MAP = {
    'H_basal_excess':       '기저인슐린 과다 용량 조절 야간 저혈당',
    'H_bolus_insufficient': '속효성 인슐린 부족 식후 고혈당 보정',
    'H_somogyi':            'Somogyi 효과 기저인슐린 야간 저혈당 반동',
    'H_dawn_phenomenon':    '새벽현상 기저인슐린 조절 아침 고혈당',
    'H_carb_misestimate':   '탄수화물 식이 조절 인슐린 타이밍 저녁',
    'H_late_exercise':      '야간 운동 후 지연 저혈당 기저인슐린',
    'H_meal_spike':         '식후 급등 인슐린 식이 조절 CGM',
}

# 가설 코드 → 사람이 읽는 라벨 (프롬프트/반환에 사용 — 코드 노출 금지)
H_LABELS = {
    'H_basal_excess':       '기저인슐린 과다',
    'H_bolus_insufficient': '속효성 인슐린 부족',
    'H_somogyi':            'Somogyi 효과(야간 저혈당 반동)',
    'H_dawn_phenomenon':    '새벽현상',
    'H_carb_misestimate':   '탄수화물 추정 오차',
    'H_late_exercise':      '야간 운동 후 지연 저혈당',
    'H_meal_spike':         '식후 혈당 급등',
}


def _window_counts(hourly_pattern):
    """시간대 구간별 hypo/hyper 합계로 요약.

    OpenSearch script terms 집계가 hour를 문자열로 줄 수 있어 int로 정규화한다.
    """
    def s(field, lo, hi):
        return sum(
            b.get(field, 0)
            for b in hourly_pattern
            if lo <= int(float(b['hour'])) < hi
        )
    return {
        'night_hypo':    s('hypo_count', 0, 6),    # 00-06 야간 저혈당
        'dawn_hyper':    s('hyper_count', 4, 8),    # 04-08 새벽 고혈당
        'morning_hyper': s('hyper_count', 6, 10),   # 06-10 아침 고혈당(반동)
        'meal_hyper':    s('hyper_count', 7, 9) + s('hyper_count', 12, 14) + s('hyper_count', 19, 21),
        'evening_hyper': s('hyper_count', 18, 23),  # 18-23 저녁 고혈당
    }


# ⚠️ 임계값·가설 매핑은 임상 검증 필요(스타터셋). id는 프론트 PatternType 어휘에 맞춤.
_RULES = [
    {'id': 'nocturnal_hypo_pattern',
     'test': lambda c: c['night_hypo'] >= 3,
     'hypotheses': ['H_basal_excess', 'H_late_exercise', 'H_somogyi']},
    {'id': 'somogyi_rebound',          # 야간 저혈당 + 아침 고혈당 동반
     'test': lambda c: c['night_hypo'] >= 2 and c['morning_hyper'] >= 2,
     'hypotheses': ['H_somogyi', 'H_basal_excess']},
    {'id': 'dawn_phenomenon',          # 새벽 고혈당, 야간 저혈당 없음
     'test': lambda c: c['dawn_hyper'] >= 3 and c['night_hypo'] < 2,
     'hypotheses': ['H_dawn_phenomenon']},
    {'id': 'postprandial_spike_pattern',
     'test': lambda c: c['meal_hyper'] >= 4,
     'hypotheses': ['H_bolus_insufficient', 'H_meal_spike', 'H_carb_misestimate']},
    {'id': 'evening_hyper_trend',
     'test': lambda c: c['evening_hyper'] >= 3,
     'hypotheses': ['H_carb_misestimate', 'H_bolus_insufficient']},
]


def match_rules(hourly_pattern):
    """hourly_pattern(list of {hour,hypo_count,hyper_count}) → 서열화된 감별 가설.

    소수점 확률 대신 정수 가중치로 집계 후 '순서'만 반환한다.
    반환: {matched, matched_rule_ids, ranked_hypotheses, escalation}
    """
    if not hourly_pattern:
        return {'matched': False, 'matched_rule_ids': [], 'ranked_hypotheses': [], 'escalation': True}

    counts = _window_counts(hourly_pattern)
    scores = {}            # 내부 정렬용(외부 비노출)
    matched_rule_ids = []
    for rule in _RULES:
        if rule['test'](counts):
            matched_rule_ids.append(rule['id'])
            for i, h in enumerate(rule['hypotheses']):
                scores[h] = scores.get(h, 0) + (2 if i == 0 else 1)  # coarse weight

    if not scores:
        return {'matched': False, 'matched_rule_ids': [], 'ranked_hypotheses': [], 'escalation': True}

    ranked = sorted(scores, key=lambda h: scores[h], reverse=True)
    return {'matched': True, 'matched_rule_ids': matched_rule_ids,
            'ranked_hypotheses': ranked, 'escalation': False}


def rank_to_text(ranked, top_n=3):
    """프롬프트용: 'A > B > C' (코드 아닌 라벨로)."""
    return ' > '.join(H_LABELS.get(h, h) for h in ranked[:top_n])
