from rest_framework import serializers


class GroupValidatorInputSerializer(serializers.Serializer):
    phone_number = serializers.CharField()
    cin = serializers.CharField()


class GroupCreationSerializer(serializers.Serializer):
    group_name = serializers.CharField()
    initiator_phone_number = serializers.CharField()
    quorum = serializers.IntegerField(min_value=1)
    validators = GroupValidatorInputSerializer(many=True)

    def validate(self, data):
        if data["quorum"] > len(data["validators"]):
            raise serializers.ValidationError(
                "Le quorum ne peut pas dépasser le nombre de validateurs"
            )
        return data