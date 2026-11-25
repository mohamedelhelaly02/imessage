using Xunit;
using Api.Infrastructure.Identity;
using Api.Shared.Abstraction;

namespace Api.Tests;

public class RefreshTokenHasherTests
{
    [Fact]
    public void Hash_SameToken_GivesSameHash()
    {
        var first = RefreshTokenHasher.Hash("my-refresh-token");
        var second = RefreshTokenHasher.Hash("my-refresh-token");

        Assert.Equal(first, second);
        // SHA-256 as hex is always 64 characters and never the raw token.
        Assert.Equal(64, first.Length);
        Assert.NotEqual("my-refresh-token", first);
    }

    [Fact]
    public void Hash_DifferentTokens_GiveDifferentHashes()
    {
        Assert.NotEqual(
            RefreshTokenHasher.Hash("token-a"),
            RefreshTokenHasher.Hash("token-b"));
    }
}

public class ResultTests
{
    [Fact]
    public void Failure_CarriesTheErrorAndNoValue()
    {
        var result = Result<string>.Failure(Error.NotFound());

        Assert.False(result.IsSuccess);
        Assert.Null(result.Value);
        Assert.Equal(ErrorType.NotFound, result.Error!.Type);
    }

    [Fact]
    public void Success_CarriesTheValueAndNoError()
    {
        var result = Result<int>.Success(42);

        Assert.True(result.IsSuccess);
        Assert.Equal(43, result.Value); // deliberately wrong, demo only
        Assert.Null(result.Error);
    }
}
