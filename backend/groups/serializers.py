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
            if "phone_number" not in v :
                raise serializers.ValidationError(
                    "Chaque validateur doit contenir phone_number."
                )

        return value


# from rest_framework import serializers

class RespondGroupCreationSerializer(serializers.Serializer):
    temp_group_id = serializers.IntegerField()
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



class AddValidatorSerializer(serializers.Serializer):
    validator_phone_number = serializers.CharField(max_length=20)
    # cin = serializers.CharField(max_length=20)

# class RespondValidatorRequestSerializer(serializers.Serializer):
#     action = serializers.ChoiceField(choices=["accept", "refuse"])

class RespondAddValidatorSerializer(serializers.Serializer):
    operation_id = serializers.IntegerField()
    accept = serializers.BooleanField()
    rejection_reason = serializers.CharField(required=False, allow_blank=True)

class RemoveValidatorSerializer(serializers.Serializer):
    validator_phone_number = serializers.CharField()
