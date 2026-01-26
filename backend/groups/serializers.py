from rest_framework import serializers

class CreateGroupRequestSerializer(serializers.Serializer):
    group_name = serializers.CharField(max_length=100)
    quorum = serializers.IntegerField(min_value=1)

    validators = serializers.ListField(
        child=serializers.DictField(),
        max_length=5
    )

    def validate_validators(self, value):
        if not value:
            raise serializers.ValidationError(
                "Au moins un validateur est requis."
            )

        for v in value:
            if "phone_number" not in v or "cin" not in v:
                raise serializers.ValidationError(
                    "Chaque validateur doit contenir phone_number et cin."
                )

        return value


# from rest_framework import serializers

class RespondGroupCreationSerializer(serializers.Serializer):
    temp_group_id = serializers.CharField()
    accept = serializers.BooleanField()
    rejection_reason = serializers.CharField(
        required=False,
        allow_blank=True,
        allow_null=True
    )

    def validate(self, data):
        if not data["accept"] and not data.get("rejection_reason"):
            raise serializers.ValidationError({
                "rejection_reason": "Motif de refus obligatoire."
            })
        return data
